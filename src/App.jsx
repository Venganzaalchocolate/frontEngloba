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
  const [listResponsability, setlistResponsability] = useState(null);


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
  try {
    if (user.role === 'root' || user.role === 'global') {
      setlistResponsability([]); // listo aunque no tenga dispositivos
      return;
    }
    const resp = await getDispositiveResponsable({ _id: user._id }, token);
    setlistResponsability(Array.isArray(resp) ? resp : []); // fallback a []
  } catch (e) {
    console.error('Error cargando responsabilidades:', e);
    setlistResponsability([]); // evita quedarse en null
  }
};

  useEffect(() => {
  let cancelled = false;

  const isLogged = async () => {
    setCharge(true);
    try {
      const token = getToken();
      if (!token) { logout(); return; }

      const user = await tokenUser(token);
      if (!user || user.error) { logout(); return; }

      await chargeResponsability(user, token);
      if (cancelled) return;

      changeLogged(user);
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


  const ready = logged.isLoggedIn && listResponsability !== null;

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
        <Route path="/*" element={<NotFound />} />
      </Routes>
      {modal.open && <Modal data={modal} closeModal={() => setModal({ open: false })} />}
      {charge && <Spinnning status={charge} />}
    </BrowserRouter>
  );
}

if (!ready) {
  return (
    <>
      {modal.open && <Modal data={modal} closeModal={() => setModal({ open: false })} />}
      <Spinnning status={true} />
    </>
  );
}

// 👉 Ramas privadas (ya tenemos listResponsability)
return (
  <OfferProvider>
    <MenuWorkerProvider>
      <BrowserRouter>
        <Header listResponsability={listResponsability} />
        <Routes>
          <Route path="/" element={
            <WorkerMenu listResponsability={listResponsability} charge={setCharge} modal={changeModal} />
          } />
          <Route path="/*" element={<WorkerMenu charge={setCharge} modal={changeModal} />} />
          <Route path="/ofertas" element={<JobsPanel modal={changeModal} charge={setCharge} />} />
          <Route path="/ofertas/:id" element={<JobsPanel modal={changeModal} charge={setCharge} />} />
          <Route path="/trabajaconnosotros" element={<FormJobUp modal={changeModal} charge={setCharge} />} />
          <Route path="/trabajaconnosotros/:id" element={<FormJobUp modal={changeModal} charge={setCharge} />} />
        </Routes>
        {modal.open && <Modal data={modal} closeModal={() => setModal({ open: false })} />}
        {charge && <Spinnning status={charge} />}
      </BrowserRouter>
    </MenuWorkerProvider>
  </OfferProvider>
);

}

export default App
