import { useEffect, useState } from 'react'
import './App.css'
import Header from './components/globals/Header'
import { getToken } from './lib/serviceToken'
import { useLogin } from './hooks/useLogin.jsx';
import { getDispositiveResponsable, tokenUser } from './lib/data.js'
import MenuStart from './components/globals/MenuStart.jsx';
import JobsPanel from './components/jobs/JobsPanel.jsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WorkerMenu from './components/globals/WorkerMenu.jsx';
import Modal from './components/globals/Modal.jsx';
import NotFound from './components/globals/NotFound.jsx';
import Spinnning from './components/globals/Spinning.jsx';
import { MenuWorkerProvider } from './context/MenuWorkerProvider.jsx'
import { OfferProvider } from './context/OfferProvider.jsx';
import FormJobUp from './components/globals/FormJobUp.jsx';



function App() {
  const { logged, changeLogged, logout } = useLogin()
  const [listResponsability, setlistResponsability] = useState([]);


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

    const chargeResponsability = async (user, token) => {
      if (user.role !== 'root' && user.role !== 'global') {
        const idUser = user._id;
        const dataAux = { _id: idUser };
        const responsability = await getDispositiveResponsable(dataAux, token);
        setlistResponsability(responsability);
      }
    };


  useEffect(() => {
    const isLogged = async () => {
      const token = getToken();
      if (token) {
        const user = await tokenUser(token);
        if (!user || user.error) {
          logout();
        } else {
          changeLogged(user);
          chargeResponsability(user,token)
        }
      } else {
        logout();
      }
      setCharge(false);
    };

    isLogged();
  }, []);


  if (logged.isLoggedIn) {
    return (
      <OfferProvider>
        <MenuWorkerProvider>
          <BrowserRouter>
            <Header listResponsability={listResponsability}/>
            <Routes>
              <Route path="/" element={<WorkerMenu listResponsability={listResponsability} charge={(x) => setCharge(x)} modal={(title, message) => changeModal(title, message)} />}></Route>
              <Route path="/*" element={<WorkerMenu charge={(x) => setCharge(x)} modal={(title, message) => changeModal(title, message)} />}></Route>
              <Route path="/ofertas" element={<JobsPanel modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)}></JobsPanel>}></Route>
              <Route path="/ofertas/:id" element={<JobsPanel modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)}></JobsPanel>}></Route>
              <Route path="/trabajaconnosotros" element={<FormJobUp modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)} />}></Route>
              <Route path="/trabajaconnosotros/:id" element={<FormJobUp modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)} />}></Route>
            </Routes>
            {modal.open && <Modal data={modal} closeModal={() => setModal({ open: false })}></Modal>}
            {charge && <Spinnning status={charge}></Spinnning>}
          </BrowserRouter>
        </MenuWorkerProvider>
      </OfferProvider>
    )

  } else {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MenuStart charge={(x) => setCharge(x)} />}></Route>
           <Route path="/ofertas" element={<JobsPanel modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)}></JobsPanel>}></Route>
          <Route path="/ofertas/:id" element={<JobsPanel modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)}></JobsPanel>}></Route>
          <Route path="/trabajaconnosotros" element={<FormJobUp modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)} />}></Route>
          <Route path="/trabajaconnosotros/:id" element={<FormJobUp modal={(title, message) => changeModal(title, message)} charge={(x) => setCharge(x)} />}></Route>
          <Route path="/*" element={<NotFound />} />
          <Route path="/*" element={<NotFound />}></Route>
        </Routes>
        {modal.open && <Modal data={modal} closeModal={() => setModal({ open: false })} />}
        {charge && <Spinnning status={charge}></Spinnning>}
      </BrowserRouter>
    )
  }

}

export default App
