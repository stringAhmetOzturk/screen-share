import express from 'express' // Add this line to import express
import fs from 'fs'
import {db} from './config/connection.js'
import cors from "cors"
import { exec } from 'child_process'
import bodyParser from 'body-parser'
import http from 'http';
import { Server as socketIO } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import robot from '@jitsi/robotjs';
import bcrypt from "bcrypt"
import path from 'path';
import cookieParser from "cookie-parser"
const app = express(); 
const corsOptions = {
  origin: ['http://localhost:3000','http://192.168.178.153:3000','http://192.168.178.131:3000','http://192.168.178.153:5000','http://192.168.178.131:5000',] // İzin vermek istediğiniz origin adresi
};

app.use(cors(corsOptions));
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json())
app.use(cookieParser())
app.use(express.static(path.resolve(__dirname, 'public')));
// app.get('*', (req, res) => {
//     res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
//   });
const server = http.createServer(app); // Rename http to server
const io = new socketIO(server);

const saltRounds = 10
app.post('/register', async(req,res)=>{
  const q =
  "INSERT INTO admin (username,password) VALUES (?)";
  const password = req.body.password;
  const queryValues = [
    req.body.username,
  ];

  if (password) {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    queryValues.push(hashedPassword);
  }
  db.query(q, [queryValues], (error, data) => {
    if (error) {

      return res.status(400).json(error);
    } 
    else{
      res.json(data)
    }
})
})
// Route to login
app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (username && password) {
    try {
      const q = "SELECT * FROM admin WHERE username = ?"
      db.query(q,username,(error,data)=>{
        if(error || data.length === 0){
          res.status(400).json({message:"Wrong credentials!"})
        }else{
          bcrypt.compare(password, data[0].password, (err, result) => {
            if (err) {
                
              res.status(500).json({ message: "An error occurred during login" });
            } else if (result) {
              res.status(200).json(data[0])
            }
          })
        }
      })
    } catch (error) {
      throw(error)
    }
   
  }else{
    res.status(400).json({message:"Please fill the credentials!"})
  }
});

// Route to get students
app.get('/get-students', (req, res) => {
  const q = "SELECT students.id,students.name,students.surname,students.studentId,students.secretKey,connectiontime.date,connectiontime.minute FROM students LEFT JOIN connectiontime ON connectiontime.studentId = students.studentId"
  db.query(q,(error,data)=>{
    if(error){
      console.log(error)
      res.status(400).json({message:"Error"})
    }else{
      res.send(data)
    }
  })
});

// Route to get students
app.delete('/delete-student/:id', (req, res) => {
  const id = req.params.id
  const q = "DELETE FROM students WHERE id = ?"
  db.query(q,id,(error,data)=>{
    if(error){
      res.status(400).json({message:"Error"})
    }else{
      res.send(data)
    }
  })
});

// Route to get students
app.post('/check-keyCode', (req, res) => {
  const keyCode = req.body.keyCode
  const q = "SELECT * FROM students INNER JOIN connectiontime ON connectiontime.studentId = students.studentId WHERE secretKey = ?"
  db.query(q,keyCode,(error,data)=>{
    if(error){
      res.status(400).json({message:error})
    }else{
      res.send(data)
    }
  })
});


// Route to update admin password
app.put('/update-password', (req, res) => {
  const username = req.body.username
  const password = req.body.password
  const q = "UPDATE admin SET password = ? WHERE username = ?"
  db.query(q,[password,username],(error,data)=>{
    if(error){
      res.status(400).json({message:"Error"})
    }else{
      res.send(data)
    }
  })
});


// Route to add student
app.post('/add-student', (req, res) => {
    const values = [
      req.body.name,
      req.body.surname,
      req.body.studentId,
      req.body.secretKey
    ]

  if (values.length === 4) {

    const q = "INSERT INTO students (name,surname,studentId,secretKey) VALUES (?)"
    db.query(q,[values],(error,data)=>{
      if(error){
        res.status(400).json({message:"Wrong credentials!"})
      }else{
        res.sendFile(__dirname + '/public/index.html');
      }
    })
  }else{
    res.status(400).json({message:"Please fill the credentials!"})
  }
});

app.post('/assign-time', (req, res) => {
  const studentId = req.body.studentId;
  const date = req.body.date;
  const minute = req.body.minute;

  // First, check if the studentId exists in the table
  const checkQuery = "SELECT * FROM connectiontime WHERE studentId = ?";
  db.query(checkQuery, [studentId], (checkError, checkResult) => {
    if (checkError) {
      res.status(400).json({ message: "Error checking studentId existence" });
    } else {
      if (checkResult.length === 0) {
        // If the studentId does not exist, insert a new record
        const insertQuery = "INSERT INTO connectiontime (studentId, date, minute) VALUES (?, ?, ?)";
        const values = [studentId, date, minute];
        db.query(insertQuery, values, (insertError, insertResult) => {
          if (insertError) {
            res.status(400).json({ message: "Error inserting record" });
          } else {
            res.send(insertResult);
          }
        });
      } else {
        // If the studentId exists, update the existing record
        const updateQuery = "UPDATE connectiontime SET date = ?, minute = ? WHERE studentId = ?";
        const updateValues = [date, minute, studentId];
        db.query(updateQuery, updateValues, (updateError, updateResult) => {
          if (updateError) {
            res.status(400).json({ message: "Error updating record" });
          } else {
            res.send(updateResult);
          }
        });
      }
    }
  });
});


io.on('connection', (socket)=> {

    socket.on("join-message", (roomId) => {
        socket.join(roomId);
        console.log("User joined in a room : " + roomId);
    })

    socket.on("screen-click", (data) => {
            var clickData = JSON.parse(data);

            // Extract the x and y coordinates from the parsed data
            var x = clickData.adjustedX
            var y = clickData.adjustedY
            console.log(x,y)
         
            if(y<800){
              robot.moveMouse(x, y); // İsteğe bağlı olarak tıklamadan önce fareyi bu koordinatlara taşıyabilirsiniz
              robot.mouseClick("left", false); // This will perform a left double click
            }
    })

    
    socket.on("screen-dblclick", (data) => {
      var clickData = JSON.parse(data);
      // Extract the x and y coordinates from the parsed data
      var x = clickData.adjustedX
      var y = clickData.adjustedY
      console.log(x,y)
  
      if(y<800){
        robot.moveMouse(x, y); // İsteğe bağlı olarak tıklamadan önce fareyi bu koordinatlara taşıyabilirsiniz
        robot.mouseClick("left", true); // This will perform a left double click
      }

})

    socket.on("copy-event",(data)=>{
      // Ctrl tuşuna basılı tutma işlemi
      robot.keyToggle("control", "down");

      // C tuşuna basma işlemi
      robot.keyTap("c");

      // Ctrl tuşunu serbest bırakma işlemi
      robot.keyToggle("control", "up");
    })

    socket.on("selectall-event",(data)=>{
      // Ctrl tuşuna basılı tutma işlemi
      robot.keyToggle("control", "down");

      // C tuşuna basma işlemi
      robot.keyTap("a");

      // Ctrl tuşunu serbest bırakma işlemi
      robot.keyToggle("control", "up");
    })

    
    socket.on("delete-event",(data)=>{

      // C tuşuna basma işlemi
      robot.keyTap("delete");

    })

    socket.on("paste-event",(data)=>{
      // Ctrl tuşuna basılı tutma işlemi
      robot.keyToggle("control", "down");

      // C tuşuna basma işlemi
      robot.keyTap("v");

      // Ctrl tuşunu serbest bırakma işlemi
      robot.keyToggle("control", "up");
    })

    socket.on("screen-rghtclick", (data) => {
        try {
            var data = JSON.parse(data);
       
            // Extract the x and y coordinates from the parsed data
            var key = data.key
            var keyCode = data.keyCode

            const command = `nircmd.exe sendmouse right click`;

            // Execute the command
            exec(command, (error, stdout, stderr) => {
              if (error) {
                console.error(`Error executing command: ${error}`);
                return;
              }
            })

        } catch (error) {
            console.error("Error parsing JSON:", error);
        }
    })

    socket.on("screen-keyboard", (data) => {
        try {
            var data = JSON.parse(data);
      
            // Extract the x and y coordinates from the parsed data
            var key = data.key
            var keyCode = data.keyCode

            const command = `nircmd.exe sendkey ${key} down`;
            // Execute the command
            exec(command, (error, stdout, stderr) => {
              if (error) {
                console.error(`Error executing command: ${error}`);
                return;
              }
              const command2 = `nircmd.exe sendkey ${key} up`;
              exec(command2, (error, stdout, stderr) => {
                if (error) {
                  console.error(`Error executing command: ${error}`);
                  return;
                }
                
              })
            })

        } catch (error) {
            console.error("Error parsing JSON:", error);
        }
    })

    socket.on("screen-data", function(data) {
        data = JSON.parse(data);
        var room = data.room;
        var imgStr = data.image;
        socket.broadcast.to(room).emit('screen-data-listener', imgStr);
    })


    
    socket.on("code-message", function(data) {
        data = JSON.parse(data);
        var text = data.text
        var room = data.room;
        socket.broadcast.to(room).emit('code-message', text);
           // Write message to a text file
           fs.writeFile('C:/Users/Ahmet/Desktop/output.txt', text, (err) => {
            if (err) {
              
                console.error('Error writing to file:', err);
            } else {
                console.log('Message written to output.txt');
            }
        });
    })
})

var server_port = process.env.YOUR_PORT || process.env.PORT || 5000;
server.listen(server_port, () => {
    console.log("Started on : "+ server_port);
})