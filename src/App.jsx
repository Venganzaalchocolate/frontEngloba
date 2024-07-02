import { useEffect, useState } from 'react'
import './App.css'
import Header from './components/globals/Header'
import { getToken } from './lib/serviceToken'
import { useLogin } from './hooks/useLogin.jsx';
import { tokenUser } from './lib/data.js'
import Login from './components/globals/Login.jsx';
import MenuStart from './components/globals/MenuStart.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WorkerMenu from './components/globals/WorkerMenu.jsx';
import FormJob from './components/globals/FormJob.jsx';
import Modal from './components/globals/Modal.jsx';

function App() {
  const { logged, changeLogged, logout } = useLogin()
  const [modal, setModal]=useState({
    open:false,
    title:'',
    message:''
})

  const changeModal=(title, message, status=true)=>{
    const textAux={
      open:status,
      title:title,
      message:message
    }
    setModal(textAux)
  }



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
          <Route path="/" element={<WorkerMenu modal={(title, message)=>changeModal(title, message)}/>}></Route>
          <Route path="/login" element={<Login modal={(title, message)=>changeModal(title, message)}/>}></Route>
        </Routes>
        {modal.open && <Modal data={modal} closeModal={()=>setModal({open:false})}></Modal>}
      </BrowserRouter>
    )

  } else {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MenuStart/>}></Route>
          <Route path="/login" element={<Login />}></Route>
          <Route path="/trabajaconnosotros" element={<FormJob modal={(open, title, message)=>changeModal(open, title, message)}/>}></Route>
          
        </Routes>
        {modal.open && <Modal data={modal} closeModal={()=>setModal({open:false})} />}
      </BrowserRouter>
    )
  }

}

export default App
