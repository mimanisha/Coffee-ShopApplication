const express = require('express');
const connection = require('../connection');
const router = express.Router();

const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

var auth = require('../services/authentication');
var checkRole = require('../services/checkRole');

router.post('/signup', (req, res) => {
    let user = req.body;
    const query = "select email,password,role,status from user where email=?"
    connection.query(query, [user.email], (err, results) => {
        if (!err) {
            if (results.length <= 0) {
                const query = "insert into user(name,contactNumber,email,password,status,role) values(?,?,?,?,'false','user')";
                connection.query(query, [user.name, user.contactNumber, user.email, user.password], (err, results) => {
                    if (!err) {
                        return res.status(200).json({ message: "Successfully Registered" });
                    }
                    else {
                        return res.status(500).json(err);
                    }
                })
            }
            else {
                return res.status(400).json({ message: "Email is already Exist." });
            }
        }
        else {
            return res.status(500).json(err);
        }
    })
})

router.post('/login', (req, res) => {
    const user = req.body;
    const query = "select email,password,role,status from user where email=?";
    connection.query(query, [user.email], (err, results) => {
        if (!err) {
            if (results.length <= 0 || results[0].password != user.password) {
                return res.status(401).json({ message: "Incorrect username or password" });
            }
            else if (results[0].status === 'false') {
                return res.status(401).json({ message: "wait for Admin Approval" });
            }
            else if (results[0].password == user.password) {
                const response = { email: results[0].email, role: results[0].role }
                const accessToken = jwt.sign(response, process.env.ACCESS_TOKEN, { expiresIn: '240h' })
                res.status(200).json({ token: accessToken });

            }
            else {
                return res.status(400).json({ message: "Something went wrong ,Please try again later" });
            }
        }
        else {
            return res.status(500).json(err);
        }
    })
})

var transporter = nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.EMAIL,
        pass:process.env.PASSWORD
    }
})

router.post('/forgotpassword',(req,res)=>{
    const user = req.body;
  const query = "select email,password from user where email=?";
  connection.query(query,[user.email],(err,results)=>{
    if(!err){
        if(results.length <=0){
            return res.status(200).json({message:"password sent successfully to your mail"});
        }
        else{
            var mailoption ={
                from:process.env.EMAIL,
                to:results[0].email,
                subject:'password by cafe management system',
                html:'<p><b>Your login details for cafe management System</b><br><b>Email:</b>'+results[0].email+'<br><b>Password:</b>'+results[0].password+'<br><a href="http://localhost:4200/">Click here to login</a></p>'
            };
            transporter.sendMail(mailoption,function(error,info){
                if(error){
                    console.log(error);
                }
                else{
                    console.log('Email send: '+info.response);
                }
            });
            return res.status(200).json({message:"password sent successfully to your mail"});
        }
        
    }
    else{
        return res.status(500).json(err);
    }
  })
})

router.get('/get',auth.authenticateToken,checkRole.checkRole,(req,res)=>{
    const query = "select id,name,email,contactNumber,status from user where role='user'";
    connection.query(query,(err,results)=>{
        if(!err){
            return res.status(200).json(results);
        }else{
            return res.status(500).json(err);
        }
    })
})

router.patch('/update',auth.authenticateToken,checkRole.checkRole, (req,res)=>{
    let user = req.body;
    const query = "update user set status=? where id=?";
    connection.query(query,[user.status,user.id],(err,results)=>{
        if(!err){
            if(results.affectedRows == 0){
                return res.status(404).json({message:"user id does not exist "});
            }
            else{
                return res.status(200).json({message:"User Update is successfully"});
            }
        }else{
            return res.status(500).json.apply(err);
        }
    })
})

router.get('/checkToken',auth.authenticateToken,(req,res)=>{
    return res.status(200).json({message:"true"});
})

router.post('/changepassword',auth.authenticateToken,(req,res)=>{
    const user = req.body;
    const email =res.locals.email;
    const query = "select * from user where email=? and password=?";
    connection.query(query,[email,user.oldPassword],(err,results)=>{
        if(!err){
            if(results.length <=0){
                return res.status(400).json({message:"Incorrect old password"});
            }
            else if(results[0].password == user.oldPassword){
                const query = "update user set password=? where email =?";
                connection.query(query,[user.newPassword,email],(err,results)=>{
                    if(!err){
                        return res.status(200).json({message:"Password updated successfully.."});
                    }
                    else{
                        return res.status(500).json(err);
                    }
                })
            }
            else{
                return res.status(400).json({message:"Something wnt wrong please try again later"});
            }
        }
        else{
            return res.status(500).json(err);
        }
    })
})



module.exports = router;
