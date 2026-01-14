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
import FormVolunteerUp from './components/volunteer/FormVolunteerUp.jsx';



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
    let cancelled = false;

    const isLogged = async () => {
      setCharge(true);
      try {
        const token = getToken();
        if (!token) { logout(); return; }
        const data = await tokenUser(token);
        if (!data || data.error) { logout(); return; }
        changeLogged(data.user, data.listResponsability);
      } catch (e) {
        console.error(e);
        logout();
      } finally {
        if (!cancelled) setCharge(false);
      }
    };

    isLogged();
    return () => { cancelled = true; };
  }, []);



  if (!logged.isLoggedIn) {
    // 👉 Rutas públicas (sin Header/WorkerMenu)
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MenuStart charge={setCharge} />} />
          <Route path="/ofertas" element={<JobsPanel modal={changeModal} charge={setCharge} />} />
          <Route path="/ofertas/:id" element={<JobsPanel modal={changeModal} charge={setCharge} />} />
          <Route path="/trabajaconnosotros" element={<FormJobUp modal={changeModal} charge={setCharge} />} />
          <Route path="/trabajaconnosotros/:id" element={<FormJobUp modal={changeModal} charge={setCharge} />} />
          <Route path="/formulariovoluntariado" element={<FormVolunteerUp modal={changeModal} charge={setCharge} />} />
          <Route path="/*" element={<NotFound />} />
        </Routes>
        {modal.open && <Modal data={modal} closeModal={() => setModal({ open: false })} />}
        {charge && <Spinnning status={charge} />}
      </BrowserRouter>
    );
  }

 
  return (
    <OfferProvider>
      <MenuWorkerProvider>
        <BrowserRouter>
          <Header listResponsability={logged.listResponsability} />
          <Routes>
            <Route path="/" element={
              <WorkerMenu listResponsability={logged.listResponsability} charge={setCharge} modal={changeModal} />
            } />
            <Route path="/*" element={<WorkerMenu charge={setCharge} modal={changeModal} />} />
            <Route path="/ofertas" element={<JobsPanel modal={changeModal} charge={setCharge} />} />
            <Route path="/ofertas/:id" element={<JobsPanel modal={changeModal} charge={setCharge} />} />
            <Route path="/trabajaconnosotros" element={<FormJobUp modal={changeModal} charge={setCharge} />} />
            <Route path="/trabajaconnosotros/:id" element={<FormJobUp modal={changeModal} charge={setCharge} />} />
            <Route path="/formulariovoluntariado" element={<FormVolunteerUp modal={changeModal} charge={setCharge} />} />
          </Routes>
          {modal.open && <Modal data={modal} closeModal={() => setModal({ open: false })} />}
          {charge && <Spinnning status={charge} />}
        </BrowserRouter>
      </MenuWorkerProvider>
    </OfferProvider>
  );

}

export default App
