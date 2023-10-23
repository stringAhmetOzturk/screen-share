import React, { useState } from 'react'
import "./login.css"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { useDispatch } from 'react-redux'
import { loginSuccess } from '../../redux/authReducer';

const Login = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [username,setUsername] = useState("")
  const [password,setPassword] = useState("")
  const login = async(e) =>{
    e.preventDefault() 
    if(username && password){
      const res = await axios.post(process.env.REACT_APP_API_URL+"login", { username: username, password: password }, {
        method: 'POST',
        credentials: 'include', // Include cookies
        
        headers: {
          'Access-Control-Allow-Origin': 'https://85.214.227.222:3000',
          'Content-Type': 'application/json',
        }
      });
      
      if(res.status === 200){
        dispatch(loginSuccess({user: res.data }))
        navigate("/")
      }else{
        console.log(res.message)
      }
    }
  }
  return (
    <div className='loginPage'>
      <span>Screen Cast Admin</span>
        <form onSubmit={login}>
            <input className='loginInput' type="text" onChange={(e)=>setUsername(e.target.value)} placeholder="Username"/>
            <input className='loginInput' type="password" onChange={(e)=>setPassword(e.target.value)}  placeholder="Password"/>
            <button type="submit">Login</button>
        </form>
    </div>
  )
}

export default Login
