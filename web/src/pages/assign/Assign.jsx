import React, { useEffect, useState } from 'react';
import "./assign.css";
import { Select, InputLabel, MenuItem, FormControl } from '@mui/material';
import axios from 'axios';
import Navbar from '../../components/Navbar';
import { useNavigate } from 'react-router-dom';

const Assign = () => {
  const navigate = useNavigate()
  const [date,setDate] = useState("")
  const [minute,setMinute] = useState("")
  const [students, setStudents] = useState([]);
  const [studentOption, setStudentOption] = useState(''); // Initialize with an empty string

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await axios.get(process.env.REACT_APP_API_URL+"get-students");
        setStudents(res.data);
      } catch (error) {
        console.log(error.message);
      }
    };
    fetchStudents();
  }, []);

  const assignTime = async () => {
    try {
      const res = await axios.post(process.env.REACT_APP_API_URL+"assign-time", {
        studentId: studentOption.studentId,
        date: date,
        minute: minute
      });
      if(res.status === 200){
        navigate("/")
      }else{
        console.log("Error")
      }
    } catch (error) {
      console.log(error);
    }
  };
  
  const handleStudentSelect = (event) => {
    setStudentOption(event.target.value);
  };

  return (
    <div>
      <Navbar />
      <div className='addPage'>
      <form onSubmit={assignTime}>
        <span>Assign Time</span>
        <FormControl style={{marginBottom:"15px",width:"100%"}}>
          <InputLabel>Select a student</InputLabel>
          <Select
  value={studentOption}
  onChange={handleStudentSelect}
>
  {students.map((student) => (
    <MenuItem key={student.id} value={student}>
      {student.name} {student.surname}
    </MenuItem>
  ))}
</Select>

        </FormControl>
        <input className='assignInput' type="datetime-local" onChange={(e)=>setDate(e.target.value)} placeholder="Date" />
        <input className='assignInput' type="time" onChange={(e)=>setMinute(e.target.value)}  placeholder="Minutes" />
        <button type="submit">Assign</button>
      </form>
      </div>
    </div>
  );
};

export default Assign;
