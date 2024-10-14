
const jwt =require("jsonwebtoken");

function authenticateToken(req,res,next){
    const token = req.headers['authorization']?.split(' ')[1]; 
    // const cookie = req.cookie.jwt

    if(!token) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if(err) return res.sendStatus(403);
        req.user=user;
        // req.cookie=cookie;
        next();
    })
}


module.exports={
    authenticateToken
}


