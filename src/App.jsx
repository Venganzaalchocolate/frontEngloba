import { useEffect, useState } from 'react'
import './App.css'
import Header from './components/globals/Header'
import { getToken } from './lib/serviceToken'
import { useLogin } from './hooks/useLogin.jsx';
import { tokenUser } from './lib/data.js'
import Login from './components/globals/Login.jsx';
import MenuStart from './components/globals/MenuStart.jsx';
import JobsPanel from './components/jobs/JobsPanel.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WorkerMenu from './components/globals/WorkerMenu.jsx';
import FormJob from './components/globals/FormJob.jsx';
import Modal from './components/globals/Modal.jsx';
import NotFound from './components/globals/NotFound.jsx';
import Spinnning from './components/globals/Spinning.jsx';
import { MenuWorkerProvider } from './context/MenuWorkerProvider.jsx'
import { BagProvider } from './context/BagProvider.jsx';


function App() {
  const { logged, changeLogged, logout } = useLogin()

  const [modal, setModal] = useState({
    open: false,
    title: '',
    message: ''
  })
  const [charge, setCharge] = useState(true)

  const changeModal = (title, message, status = true) => {
    const textAux = {
      open: status,
      title: title,
      message: message
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
          setCharge(false)
        } else {
          changeLogged(user)
          setCharge(false)
        }
      } else {
        logout()
        setCharge(false)
      }
    }
    isLogged();
   
  }, [])


  if (logged.isLoggedIn) {
    return (
      <BagProvider>
        <MenuWorkerProvider>
          <BrowserRouter>
            <Header/>
            <Routes>
              <Route path="/" element={<WorkerMenu charge={(x) => setCharge(x)} modal={(title, message) => changeModal(title, message)} />}></Route>
              <Route path="/*" element={<WorkerMenu charge={(x) => setCharge(x)} modal={(title, message) => changeModal(title, message)} />}></Route>
            </Routes>
            {modal.open && <Modal data={modal} closeModal={() => setModal({ open: false })}></Modal>}
            {charge && <Spinnning status={charge}></Spinnning>}
          </BrowserRouter>
        </MenuWorkerProvider>
      </BagProvider>
    )

  } else {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MenuStart charge={(x) => setCharge(x)} />}></Route>
          <Route path="/login" element={<Login charge={(x) => setCharge(x)} />}></Route>
          <Route path="/trabajaconnosotros" element={<FormJob modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)} />}></Route>
          <Route path="/trabajaconnosotros/:id" element={<FormJob modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)} />}></Route>
          {/* <Route path="/ofertas"  element={<JobsPanel modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)}></JobsPanel>}></Route>
          <Route path="/ofertas/:id"  element={<JobsPanel modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)}></JobsPanel>}></Route> */}
          <Route path="/*" element={<NotFound />}></Route>
        </Routes>
        {modal.open && <Modal data={modal} closeModal={() => setModal({ open: false })} />}
        {charge && <Spinnning status={charge}></Spinnning>}
      </BrowserRouter>
    )
  }

}

export default App
