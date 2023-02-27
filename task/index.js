require("dotenv").config();
const http = require("http");
const fs = require("fs");

const jwt = require("jsonwebtoken");
const { hashPassword } = require("./database/module/hashpassword.js");

const userDataUrl = "./database/user.json";
const emailUrl = "./database/email.json";
const configUrl = "./database/config.json";

function serverHandler(req, res) {
    let userData , emailData , configData;
 try{
     userData = JSON.parse(fs.readFileSync(userDataUrl, "utf-8"));
     emailData = JSON.parse(fs.readFileSync(emailUrl, "utf-8"));
     configData = JSON.parse(fs.readFileSync(configUrl, "utf-8"));
 }catch(err){
        res.writeHead(500);
        res.end("server is now under maintaince ");
 }
  //////////////////////////////////////////////////////////////////////////////////////////////
  if (req.method === "POST" && req.url === "/signup") {
    console.log(globalThis)
    let body = "";
    req.on("data", (data) => {
      body += data;
    });
    req.on("end", () => {
      try {
        body = JSON.parse(body);
      } catch (err) {
        res.writeHead(404);
        return res.end("please provide the data");
      }
      if (
        !body.name ||
        !body.email ||
        !body.password ||
        !body.role ||
        !["student", "teacher"].includes(body.role) ||
        (body.role === "teacher" && !body.subject) ||
        (body.role === "student" && body.subject) ||
        (body.role === 'teacher' && typeof body.subject ==='object' )
      ) {
        res.writeHead(404);
        return res.end("please provide the all data");
      }
      //  console.log("body" , body);
      if (emailData[body.email]) {
        res.writeHead(400);
        return res.end("email is also registered");
      }
      if (body.role === "teacher") {
        body.students = {};
      } else {
        body.marks = {};
      }
      body.id = configData.id++; // config file
      userData[body.id] = body; // update data in user file
      emailData[body.email] = body.id; // update data in email file

      body.password = hashPassword(body.password);

      fs.writeFileSync(userDataUrl, JSON.stringify(userData));
      fs.writeFileSync(configUrl, JSON.stringify(configData));
      fs.writeFileSync(emailUrl, JSON.stringify(emailData));
      const token = jwt.sign({ id: body.id }, process.env.SECRET_KEY, {
        expiresIn: "30m",
      });
      return res.end(JSON.stringify({ token, message: "successfull signup" }));
    });
  }
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  else if (req.method === "POST" && req.url === "/login") {
    let body = "";
    req.on("data", (data) => {
      body += data;
    });
    req.on("end", () => {
      try {
        body = JSON.parse(body);
      } catch (err) {
        res.writeHead(404);
        return res.end("please provide the data");
      }
      console.log(body);
      if (!body.email || !body.password) {
        res.writeHead(400);
        return res.end("please give me both things");
      }
      
      const id = emailData[body.email];
      if(!id){
          res.writeHead(400);
         return res.end("invalid email");
      }
      const userdata = userData[id];
      if (hashPassword(body.password) !== userdata.password) {
        res.writeHead(400);
        return res.end("password is incorrect");
      }
      const token = jwt.sign(
        {
          id: id,
        },
        process.env.SECRET_KEY,
        { expiresIn: "30m" }
      );
      res.writeHead(200);
      return res.end(JSON.stringify({ token, message: " successfull login" }));
    });
    ////////////////////////////////////////////////////////////////////////////////////////////////////////
  } else if (req.method === "GET" && req.url === "/show") {
    if (!req.headers.token) {
      res.writeHead(404);
      return res.end("invalid token request");
    }
    let id;
    try {
      ({ id: id } = jwt.verify(req.headers.token, process.env.SECRET_KEY));
    } catch (err) {
      res.writeHead(404);
      return res.end("token is expired");
    }
    // console.log(id);

    res.end(JSON.stringify(userData[id]));
  }
  ///////////////////////////////////////////////////////////////////////////////////////////////
  else if (req.method === "PATCH" && req.url === "/changePassword") {
    if (!req.headers.token) {
      res.writeHead(404);
      return res.end("invalid token request");
    }
    let id;
    try {
      ({ id: id } = jwt.verify(req.headers.token, process.env.SECRET_KEY));
    } catch (err) {
      res.writeHead(404);
      return res.end("token is expired");
    }
    let userdata = userData[id];
    let body = "";
    req.on("data", (data) => {
      body += data;
    });
    req.on("end", () => {
      try {
        body = JSON.parse(body);
      } catch (err) {
        res.writeHead(404);
        return res.end("please provide the data");
      }

      if (hashPassword(body.old) !== userdata.password) {
        return res.end("please provide the correct password");
      }
      userData[id].password = hashPassword(body.new);

      fs.writeFileSync(userDataUrl, JSON.stringify(userData));
      return res.end(
        JSON.stringify({ message: "successfully changed your password" })
      );
    });
  }
  //////////////////////////////////////////////////////////////////////////////////////////////
  else if (req.method === "PATCH" && req.url === "/changeEmail") {
    if (!req.headers.token) {
      res.writeHead(404);
      return res.end("invalid token request");
    }
    let id;
    try {
      ({ id: id } = jwt.verify(req.headers.token, process.env.SECRET_KEY));
    } catch (err) {
      res.writeHead(404);
      return res.end("token is expired");
    }
    let userdata = userData[id];
    let body = "";
    req.on("data", (data) => {
      body += data;
    });
    req.on("end", () => {
      try {
        body = JSON.parse(body);
      } catch (err) {
        res.writeHead(404);
        return res.end("please provide the data");
      }
      if(!emailData[body.new]){
        res.writeHead(404);
        return res.end("please provide a unique Email");
      }
      if (userdata.email !== body.old) {
        res.writeHead(404);
        return res.end("please provide corrrect email");
      }

      console.log(userdata.email);

      delete emailData[userdata.email];
      emailData[body.new] = id;
      userdata.email = body.new;

      fs.writeFileSync(userDataUrl, JSON.stringify(userData));
      fs.writeFileSync(emailUrl, JSON.stringify(emailData));
      return res.end(
        JSON.stringify({ message: "successfully changed your Email" })
      );
    });
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////
  else if (req.method === "PATCH" && req.url === "/select") {
    if (!req.headers.token) {
      res.writeHead(404);
      return res.end("invalid token request");
    }
    let id;
    try {
      ({ id: id } = jwt.verify(req.headers.token, process.env.SECRET_KEY));
    } catch (err) {
      res.writeHead(404);
      return res.end("token is expired");
    }
    let userdata = userData[id];
    if (userdata.role === "student") {
        res.writeHead(404);
        return res.end("you have no access to select the student");
      }
    let body = "";
    req.on("data", (data) => {
      body += data;
    });
    req.on("end", () => {
      try {
        body = JSON.parse(body);
      } catch (err) {
        res.writeHead(404);
        return res.end("please provide the data");
      }
      if(!body.id || !Array.isArray(body.id)){
        return  res.end("provide array");
      }
      let id = body.id;
     
      console.log(id);  
       id.forEach((element )=> {
           if(! userData[element] || userdata.students[element] || userData[element].role === "teacher"){
            return;
           }
           userdata.students[element] = Date.now();
    });
    fs.writeFileSync(userDataUrl , JSON.stringify(userData));
    res.end("successfully added student");;
    
  } );
}
//////////////////////////////////////////////////////////////////////////////////////////


else if(req.method === 'PATCH' && req.url === '/addMarks'){
    if(!req.headers.token){
        res.writeHead(400);
        return res.end("jwt token is required");
    } 
    let id;
    try{
      ({id: id} = jwt.verify(req.headers.token , process.env.SECRET_KEY ));
    }catch(err){
     res.writeHead(400);
     return res.end("jwt token is expired");
    }
    const userdata = userData[id];
   if(userdata.role === 'student'){
    res.writeHead(404);
    return res.end("you have not accessed to edit");
   }
   let body = "";
   req.on('data' , (data)=>{
    body+=data;
   });
   req.on('end' , ()=>{
    body = JSON.parse(body);

    for(let value of Object.values(body)) {
        if(!parseInt(value)){
            res.writeHead(404);
            return res.end("please enter a valid marks")
       }
    }

    for( let [key , value] of Object.entries(body)){
        console.log(key , value);
       if(!userData[key] || userData[key].role === "teacher" || 
          !Object.keys( userdata.students).includes(key)){
        continue;
       }
       
       if(userData[key].marks[userdata.subject]) {  
        userData[key].marks[userdata.subject] += parseInt(value); 
       } 
       else {
        userData[key].marks[userdata.subject] = parseInt(value); 
       }
    }

    fs.writeFileSync(userDataUrl, JSON.stringify(userData));
    
    res.writeHead(200);
    res.end("Successfully Updated add marks");
   })
}
//////////////////////////////////////////////////////////////////////////////////////
else if (req.method === "PATCH" && req.url === "/delete") {
    if (!req.headers.token) {
      res.writeHead(404);
      return res.end("invalid token request");
    }
    let id;
    try {
      ({ id: id } = jwt.verify(req.headers.token, process.env.SECRET_KEY));
    } catch (err) {
      res.writeHead(404);
      return res.end("token is expired");
    }
    let userdata = userData[id];
    if (userdata.role === "student") {
        res.writeHead(404);
        return res.end("you have no access to select the student");
      }
    let body = "";
    req.on("data", (data) => {
      body += data;
    });
    req.on("end", () => {
      try {
        body = JSON.parse(body);
      } catch (err) {
        res.writeHead(404);
        return res.end("please provide the data");
      }
      if(!body.id || !Array.isArray(body.id)){
        return  res.end("provide array");
      }
      let id = body.id;
     
      console.log(id);  
       id.forEach((element )=> {
          delete userdata.students[element];
    });
    fs.writeFileSync(userDataUrl , JSON.stringify(userData));
    res.end("successfully delete student");;
    
  } );
}
///////////////////////////////////////////////////////////////////////////////////
else {
    res.writeHead(404);
    res.end(" end point does not exist ");
  }
}

const server = http.createServer(serverHandler);

server.listen(process.env.PORT, () => {
  console.log(`server is started on ${process.env.PORT}`);
});