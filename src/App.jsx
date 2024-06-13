import { useEffect, useState } from 'react'
import './App.css'
import Header from './components/globals/Header'
import { getToken } from './lib/serviceToken'
import { useLogin } from './hooks/useLogin.jsx';
import { tokenUser } from './lib/data.js'
import Login from './components/globals/Login.jsx';
import MenuStart from './components/globals/MenuStart.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  const { logged, changeLogged, logout } = useLogin()

  useEffect(() => {
    const isLogged = async () => {
      const token = getToken();
      if (token != null) {
        const user = await tokenUser(token)
        if (user == null || user.error) {
          logout()
        } else {
          changeLogged(user)
        }
      } else {
        logout()
      }
    }
    isLogged();
  }, [])

  if (logged.isLoggedIn) {
    return (
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/login" element={<Login />}></Route>
          <Route path="/trabajaconnosotros" element={<Login />}></Route>
        </Routes>
      </BrowserRouter>
    )

  } else {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MenuStart/>}></Route>
          <Route path="/login" element={<Login />}></Route>
          <Route path="/trabajaconnosotros" element={<Login />}></Route>
        </Routes>
      </BrowserRouter>
    )
  }

}

export default App
