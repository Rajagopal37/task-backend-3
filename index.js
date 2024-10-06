// Load environment variables
require('dotenv').config();

// Import required modules
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('./utilities');

// Import models
const User = require('./models/user.model');
const Task = require('./models/task.model');
const config = require('./config.json');

// Create an instance of Express
const app = express();

// Define the port
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
mongoose.connect(config.connectionString)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log('MongoDB not connected', err));

// Middleware to parse JSON
app.use(express.json());
app.use(cors({
    origin: "*", // Allow all origins for development, adjust for production
}));

// Routes
app.get("/", (req, res) => {
    res.json({ data: "Welcome to the Task Management API" });
});

// Create account
app.post("/create-account", async (req, res) => {
    const { fullname, email, password } = req.body;

    if (!fullname) {
        return res.status(400).json({ error: true, message: "Fullname is required." });
    }
    if (!email) {
        return res.status(400).json({ error: true, message: "Email is required." });
    }
    if (!password) {
        return res.status(400).json({ error: true, message: "Password is required." });
    }

    const isUser = await User.findOne({ email: email });
    if (isUser) {
        return res.json({ error: true, message: "User already exists." });
    }

    const user = new User({ fullname, email, password });
    await user.save();

    const accessToken = jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "3600m" });
    return res.json({ error: false, user, accessToken, message: "Registration Successful" });
});

// Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required." });
    }
    if (!password) {
        return res.status(400).json({ message: "Password is required." });
    }

    const userInfo = await User.findOne({ email: email });
    if (!userInfo) {
        return res.status(400).json({ message: "User not found." });
    }

    if (userInfo.email === email && userInfo.password === password) {
        const user = { user: userInfo };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "3600m" });
        return res.json({ error: false, message: "Login Successful", email, accessToken });
    } else {
        return res.status(400).json({ error: true, message: "Invalid Credentials." });
    }
});

// Get logged-in user
app.get("/user", authenticateToken, async (req, res) => {
    const { user } = req.user;

    const isUser = await User.findOne({ _id: user._id });
    if (!isUser) {
        return res.sendStatus(401);
    }

    return res.json({
        user: {
            fullname: isUser.fullname,
            email: isUser.email,
            "_id": isUser._id,
            createdOn: isUser.createdOn,
        },
        message: "User retrieved successfully.",
    });
});

// Get all users
app.get("/all-users", authenticateToken, async (req, res) => {
    try {
        const users = await User.find({}, 'fullname email createdOn');
        if (!users || users.length === 0) {
            return res.status(404).json({ message: "No users found." });
        }
        return res.json({ error: false, users, message: "All Users retrieved successfully." });
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ error: true, message: "Internal Server Error." });
    }
});

// Logout
app.post("/logout", authenticateToken, (req, res) => {
    res.json({ message: "Logout Successful." });
});

// Add Task
app.post("/add-task", authenticateToken, async (req, res) => {
    const { name, description, assignDate, lastDate } = req.body;
    const { user } = req.user;

    if (!name) {
        return res.status(400).json({ error: true, message: "Title is required." });
    }
    if (!description) {
        return res.status(400).json({ error: true, message: "Description is required." });
    }
    if (!assignDate) {
        return res.status(400).json({ error: true, message: "Assign date is required." });
    }
    if (!lastDate) {
        return res.status(400).json({ error: true, message: "Last date is required." });
    }

    try {
        const task = new Task({
            name,
            description,
            assignDate,
            lastDate,
            userId: user._id,
        });
        await task.save();
        return res.json({ error: false, message: "Task Created Successfully." });
    } catch (error) {
        console.log("Error creating task", error);
        return res.status(500).json({ error: true, message: "Internal Server Error." });
    }
});

// Edit Task
app.put("/edit-task/:taskId", authenticateToken, async (req, res) => {
    const taskId = req.params.taskId;
    const { name, description, assignDate, lastDate } = req.body;
    const { user } = req.user;

    if (!name && !description && !assignDate && !lastDate) {
        return res.status(400).json({ error: true, message: "No changes provided." });
    }

    try {
        const task = await Task.findOne({ _id: taskId, userId: user._id });
        if (!task) {
            return res.status(404).json({ error: true, message: "Task Not Found." });
        }

        if (name) task.name = name;
        if (description) task.description = description;
        if (assignDate) task.assignDate = assignDate;
        if (lastDate) task.lastDate = lastDate;

        await task.save();
        return res.json({ error: false, task, message: "Task Updated Successfully." });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Internal Server Error." });
    }
});

// Get All Tasks
app.get("/all-tasks", authenticateToken, async (req, res) => {
    const { user } = req.user;

    try {
        const tasks = await Task.find({ userId: user._id });
        return res.json({ error: false, tasks, message: "All Tasks retrieved successfully." });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Server Error." });
    }
});

// Delete Task
app.delete("/delete-task/:taskId", authenticateToken, async (req, res) => {
    const taskId = req.params.taskId;
    const { user } = req.user;

    try {
        const task = await Task.findOne({ userId: user._id, _id: taskId });
        if (!task) {
            return res.status(404).json({ error: true, message: "Task not found." });
        }
        await Task.deleteOne({ userId: user._id, _id: taskId });
        return res.json({ error: false, message: "Task Deleted Successfully." });
    } catch (error) {
        return res.status(500).json({ error: true, message: "Internal Server Error." });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port localhost:${PORT}`);
});

module.exports = app;
