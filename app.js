require("dotenv").config();
const express=require('express');
const app=express();
const usermodel=require("./models/user");
const postmodel=require("./models/post");
const cookieParser = require('cookie-parser');
const path=require('path');
const bcrypt=require('bcryptjs');
const jwt=require("jsonwebtoken");

app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());

const PORT=process.env.PORT || 4000;

app.get("/",(req,res)=>{
    res.render("index")
})


app.get("/logout",(req,res)=>{
    res.cookie("token",""); 
    res.redirect("/login");
})
app.get("/about",(req,res)=>{
    res.render("about");
})

app.get("/login",(req,res)=>{
    res.render("login")
})

app.get("/profile",isLoggedin,async(req,res)=>{
    let user=await usermodel.findOne({email:req.user.email}).populate("posts");
    res.render("profile",{user});
})

app.post("/update/:id",isLoggedin,async(req,res)=>{
    let user=await postmodel.findOneAndUpdate({_id:req.params.id},{content:req.body.content});
    res.redirect("/profile");
})

app.get("/like/:id",isLoggedin,async(req,res)=>{
    let post=await postmodel.findOne({_id:req.params.id}).populate("user");
    if(post.likes.indexOf(req.user.userid) === -1)
    {
        post.likes.push(req.user.userid);
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }
   // post.likes.push(req.user.userid);
    await post.save();
    res.redirect("/profile");
}) 

app.get("/edit/:id",isLoggedin,async(req,res)=>{
    let post=await postmodel.findOne({_id:req.params.id}).populate("user");
    res.render("edit",{post})
}) 

app.post("/post",isLoggedin,async(req,res)=>{
    let user=await usermodel.findOne({email:req.user.email});
    let {content}=req.body;
   let post=await postmodel.create({
    user:user._id,
    content , 
   })
   user.posts.push(post._id);
   await user.save();
   res.redirect("/profile");
})

app.post("/login",async(req,res)=>{
    let {email,password}=req.body;

    let user=await usermodel.findOne({email});
    if(!user) return res.status(500).send("something went wrong");
    
    bcrypt.compare(password,user.password,function(err,result){

        if(result){
            let token=jwt.sign({email:email,userid:user._id },"heregivesecretkey");
            res.cookie("token",token);
            //res.status(200).send("Yes you can login");
            res.status(200).redirect("/profile")
        }
        else res.redirect("/login");
    })
})

app.post("/register",async(req,res)=>{
    let {email,password,username,name,age}=req.body;

    let user=await usermodel.findOne({email});
    if (user) return res.status(400).json({ message: "User already registered" });
    
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt, async(err,hash)=>{
           let user=await usermodel.create({
            username,
            email,
            age,
            name,
            password:hash
           }) ;
           let token=jwt.sign({email:email,userid:user._id},"heregivesecretkey");
           res.cookie("token",token)
           //res.status(201).json({ message: "Registered successfully" });
           res.redirect("/login");
        })
    }); 
})
 //it is middleware for protected route
 function isLoggedin(req,res,next)
 {
     if(req.cookies.token === "")
     {
        //res.send("you must logged in");
        res.redirect("login")
     }
     else{
         let data=jwt.verify(req.cookies.token,"heregivesecretkey");
         req.user=data;
         next();
     }
 }


app.listen(PORT,()=> {
    console.log(`"server is runing on" ${PORT}`)
});
