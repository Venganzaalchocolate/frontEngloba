
const urlApi = import.meta.env.VITE_API_URL;


const fetchData = async (
  endpoint,
  method,
  token = null,
  body = null,
  isBlob = false,
  signal = null
) => {
  const url = `${urlApi}${endpoint}`;

  const isFormData = body instanceof FormData;

  const options = {
    method,
    ...(signal && { signal }),
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && !isFormData && { "Content-Type": "application/json" }),
    },
    ...(body && { body: isFormData ? body : JSON.stringify(body) }),
  };

  try {
    const response = await fetch(url, options);

    // Si esperamos un archivo ZIP/PDF ↓↓↓
    if (isBlob) {
      if (!response.ok) {
        const text = await response.text().catch(() => ""); // evitar explosion
        throw new Error(text || `Error ${response.status}`);
      }

      return await response.blob();
    }

    // Para JSON ↓↓↓
    if (!response.ok) {
      const responseBody = await response.json().catch(() => ({}));
      throw new Error(responseBody.message || "Error en la solicitud");
    }

    const data = await response.json().catch(() => ({}));

    if (data.error) return { error: true, message: data.error };

    return data.data ? data.data : data;

  } catch (error) {
    if (error.name === "AbortError") {
      return { error: true, abort: true, message: "abort" };
    }

    return { error: true, message: error.message };
  }
};




export const tokenUser = async (token) => {
  const data = await fetchData('/validtoken', 'POST', token, { token });
  return data || { error: true, message: 'Token no valido' };
};

// enums
export const getData = () => fetchData('/infodata', 'GET');
export const getDataEmployer = () => fetchData('/infodataemployer', 'GET');
export const changeData = (token, datos) => fetchData('/changedata', 'PUT', token, datos);
export const deleteData = (token, datos) => fetchData('/deletedata', 'DELETE', token, datos);
export const createData = (token, datos) => fetchData('/createdata', 'POST', token, datos);
export const createSubData = (token, datos) => fetchData('/createsubcategory', 'POST', token, datos);
export const deleteSubData = (token, datos) => fetchData('/deletesubdata', 'DELETE', token, datos);

//userCv
export const getusercvdniorphone = (datos) => fetchData('/filterusercv', 'POST', null, datos)
export const getCVs = async (id, token) => {
  const data = await fetchData('/cv/presign-get', 'POST', token, { id });
  if (data?.error) return data; // { error:true, message:... }
  return { url: data.url };     // URL directa de MinIO
};
export const uploadCvDirect = async (id, file, token) => {
  const { url } = await fetchData('/cv/presign-put', 'POST', token, { id, contentType: file.type });
  await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  return { ok: true };
};
export const getFile = async (id, token) => {
  const pdfBlob = await fetchData('/getFile', 'POST', token, { id }, true);
  const pdfUrl = URL.createObjectURL(pdfBlob);
  return { url: pdfUrl };
};
export const getFileUser = async (id, idFile, token) => {
  const pdfBlob = await fetchData('/fileuser', 'POST', token, { id, idFile }, true);
  const pdfUrl = URL.createObjectURL(pdfBlob);
  return { url: pdfUrl };
};
export const downloadZipFiles = async (fileIds, token, signal) => {
  return await fetchData('/zip-files', 'POST', token, { fileIds }, true, signal);
};
export const downloadPayrollsZip = async (userId, token, signal) => {
  return await fetchData("/zip-payrolls","POST",token,{ userId },true,signal);
};
export const deleteUserCv = (token, datos) => fetchData('/deleteusercv', 'DELETE', token, datos);
export const modifyUser = (dataUser) => fetchData('/modifyusercv', 'PUT', null, dataUser);
export const getusercvs = (page, limit, filters, token) => fetchData('/usercvs', 'POST', token, { page, limit, ...filters });
export const getuserscvs = (datos, token) => fetchData('/userscv', 'POST', token, datos)
export const sendFormCv = async (dataForm, file, editUser = false) => {
  // 1) buscar/crear/actualizar usuario

  let userExist = await fetchData('/filterusercv', 'POST', null, editUser ? { id: dataForm._id } : dataForm);

  if (userExist.length === 0 || !userExist ) {
    userExist = await fetchData('/createusercv', 'POST', null, dataForm);
  } else {
    dataForm._id = userExist[0]._id;
    if (file){
      dataForm.numberCV = (userExist[0].numberCV || 0) + 1;
      dataForm.date=new Date()
    } 

    userExist = await fetchData('/modifyusercv', 'PUT', null, dataForm);
  }

  // 2) subir PDF
  if (file && userExist && userExist._id) {
    const contentType = file.type || 'application/pdf';
    let uploaded = false;

    // --- A) presigned PUT ---
    try {
      const presign = await fetchData('/cv/presign-put', 'POST', null, { id: userExist._id });
      if (!presign?.url) throw new Error(presign?.message || 'No presigned URL');

      const putRes = await fetch(presign.url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!putRes.ok) throw new Error(`PUT failed (${putRes.status})`);
      uploaded = true;
    } catch (e) {
      // NO devolver aquí -> seguimos al fallback
      // console.debug('presigned PUT falló, voy a fallback', e);
    }

    // --- B) fallback por backend /uploadcv ---
    if (!uploaded) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nameFile', userExist._id);

      const uploadUrl = `${urlApi}/uploadcv`;
      const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
      const uploadData = await uploadResponse.json().catch(() => ({}));

      if (!uploadResponse.ok || uploadData?.error) {
        return uploadData?.error
          ? uploadData
          : { error: true, message: 'Fallo al subir el CV' };
      }
    }
  }

  // 3) devolver usuario
  return userExist;
};




//Employee
export const createEmployer = (token, datos) => fetchData('/createemployer', 'POST', token, datos);
export const deleteEmployer = (token, datos) => fetchData('/deleteuser', 'POST', token, datos);
export const getEmployers = (token) => fetchData('/users', 'GET', token);
export const infoUser = (token, data) => fetchData('/user', 'POST', token, data);
export const getusers = (page, limit, filters, token) => fetchData('/users', 'POST', token, { page, limit, ...filters });
export const getusersnotlimit = (filters, token) => fetchData('/usersfilternotlimit', 'POST', token, { ...filters });
export const searchusername = (filters, token) => fetchData('/searchusername', 'POST', token, { ...filters });
export const usersName = (datos, token) => fetchData('/usersname', 'POST', token, datos);
export const hirings = (data, token) => fetchData('/hirings', 'POST', token, data);
export const rehireEmployee = (data, token) => fetchData('/rehireemployee', 'POST', token, data);
export const currentStatusEmployee = (data, token) => fetchData('/userscurrentstatus', 'POST', token, data);
export const editUser = (data, token) =>fetchData("/modifyuser", 'POST', token, data);
export const updatePayroll = async (data, token) => {
  const formData = new FormData();


  Object.keys(data).forEach(key => {
    // Si el campo es un archivo y existe, lo añadimos al FormData
    if (data[key] instanceof File) {
      formData.append(key, data[key], data[key].name);  // Agregar el archivo al FormData
    } else {
      // Añadir los demás campos de texto
      formData.append(key, data[key] !== null ? data[key] : '');  // Manejar valores nulos
    }
  });


  const endpoint = '/payroll';
  const method = 'POST';

  let result = null;
  // Usamos fetchData sin especificar el 'Content-Type' porque es un FormData

  if (data.type == 'get') {
    result = await fetchData(endpoint, method, token, formData, true);
    const pdfUrl = URL.createObjectURL(result);
    if (result.error) return result;
    return { url: pdfUrl };
  } else {
    result = await fetchData(endpoint, method, token, formData);

  }
  return result;
};


//login
export const loginUser = (email, password) => fetchData('/login', 'POST', null, { email, password });
export const loginUserCode = (email) => fetchData('/login', 'POST', null, { email });
export const tokenGenerate = (data) => fetchData('/validCode', 'POST', null, data);

//Offers
export const offerList = (datos) => fetchData('/offerlist', 'POST',null,  datos);
export const offerCreate = (datos, token) => fetchData('/offercreate', 'POST', token, datos);
export const offerUpdate = (datos, token) => fetchData('/offerupdate', 'POST', token, datos);
export const offerHardDelete = (datos, token) => fetchData('/offerharddelete', 'POST', token, datos);
export const offerId = (datos) => fetchData('/offerid', 'POST', null, datos);

//program
export const getPrograms = () => fetchData('/programs', 'GET');
export const getProgramId=(datos, token)=>fetchData('/program', 'POST', token, datos)
export const createProgram = (datos, token) => fetchData('/createprogram', 'POST', token, datos);
export const createDispositive = (dispositiveData, token) => fetchData('/createdispositive', 'POST', token, dispositiveData);
export const updateDispositive = (dispositiveData, token) => fetchData('/updatedevice', 'PUT', token, dispositiveData);
export const deleteDispositive = (dispositiveData, token) => fetchData('/deletedispositive', 'DELETE', token, dispositiveData);
export const getDispositiveId = (dispositiveData, token) => fetchData('/dispositive', 'POST', token, dispositiveData);
export const getDispositiveResponsable = (datos, token) => fetchData('/dispositiveresponsable', 'POST', token, datos);
export const deleteProgram = (datos, token) => fetchData('/deleteprogram', 'DELETE', token, datos);
export const updateProgram = (datos, token) => fetchData('/updateprogram', 'PUT', token, datos);
export const coordinators = (datos, token) => fetchData('/coordinators', 'POST', token, datos);
export const responsibles = (datos, token) => fetchData('/responsibles', 'POST', token, datos);
export const listsResponsiblesAndCoordinators = (datos, token) => fetchData('/listsresponsiblesprogram', 'POST', datos, token)

// filesDrive
export const createFileDrive = async (data, token) => {
  const formData = new FormData();

  Object.keys(data).forEach(key => {
    // Si el campo es un archivo y existe, lo añadimos al FormData
    if (data[key] instanceof File) {
      formData.append(key, data[key], data[key].name);  // Agregar el archivo al FormData
    } else {
      // Añadir los demás campos de texto
      formData.append(key, data[key] !== null ? data[key] : '');  // Manejar valores nulos
    }
  });
  const endpoint = '/crfilemodel';
  const method = 'POST';
  const result = await fetchData(endpoint, method, token, formData);
  return result;
};
export const deleteFileDrive = (datos, token) => fetchData('/dlfilemodel', 'POST', token, datos);
export const updateFileDrive = async (data, token) => {
  const formData = new FormData();

  Object.keys(data).forEach(key => {
    // Si el campo es un archivo y existe, lo añadimos al FormData
    if (data[key] instanceof File) {
      formData.append(key, data[key], data[key].name);  // Agregar el archivo al FormData
    } else {
      // Añadir los demás campos de texto
      formData.append(key, data[key] !== null ? data[key] : '');  // Manejar valores nulos
    }
  });
  const endpoint = '/upfilemodel';
  const method = 'POST';
  const result = await fetchData(endpoint, method, token, formData);
  return result;
};

export const getFileDrive = async (datos, token) => {
  const pdfBlob = await fetchData('/getfiledrive', 'POST', token, datos, true);
  const pdfUrl = URL.createObjectURL(pdfBlob);
  return { url: pdfUrl };
}


//documentation
export const infoDocumentation = (datos, token) => fetchData('/documentation', 'POST', token, datos);
export const infoDocumentationUnifed=(datos, token) => fetchData('/getdocumentationunified', 'POST', token, datos); 
export const infoListDocumentationProgramDispositive=(datos,token)=>fetchData('/getDocumentationProgramDispositive', 'POST', token, datos)
export const addProgramOrDispositiveToDocumentation=(datos,token)=>fetchData('/addprogramordispositivetodocumentation', 'POST', token, datos)
export const syncProgramDocsToDevices =(datos,token)=>fetchData('/syncprogramdocs', 'POST', token, datos)

//signPDF
export const requestSignature = async (data, token) => fetchData('/pdf/request-sign', 'POST', token, data);
export const confirmSignature = async (data, token) => fetchData('/pdf/confirm-sign', 'POST', token, data);

//auditoria
export const auditInfoUser = (datos, token) => fetchData('/auditinfouser', 'POST', token, datos);
export const auditInfoProgram = (datos, token) => fetchData('/auditinfoprogram', 'POST', token, datos);
export const auditInfoDevice = (datos, token) => fetchData('/auditinfodevice', 'POST', token, datos);
export const auditDocumentUser = (datos, token) => fetchData('/auditdocumentuser', 'POST', token, datos);
export const auditDocumentProgram = (datos, token) => fetchData('/auditdocumentprogram', 'POST', token, datos);
export const auditDocumentDevice = (datos, token) => fetchData('/auditdocumentdevice', 'POST', token, datos);
export const auditUserPeriod = (datos, token) => fetchData('/audituserperiod', 'POST', token, datos);

//estadisticas
export const stOverview = (token) => fetchData('/overview', 'POST', token);
export const stCvMonthly = (datos, token) => fetchData('/cvmonthly', 'POST', token, datos);
export const stCvDistribution = (datos, token) => fetchData('/cvdistribution', 'POST', token, datos);
export const stCvConversion = (datos, token) => fetchData('/cvconversion', 'POST', token, datos);
export const stAuditWorkersStats = (datos, token) => fetchData('/auditworkersstats', 'POST', token, datos);

export const stgetWorkersStats = (datos, token) => fetchData('/workersstats', 'POST', token, datos);

//workspace
export const wsInfoGroup = (datos, token) => fetchData('/infogroupws', 'POST', token, datos);
export const wsCreateGroup = (datos, token) => fetchData('/creategroupws', 'POST', token, datos);
export const wsAddMember = (datos, token) => fetchData('/addgroupws', 'POST', token, datos);
export const wsRemoveMember = (datos, token) => fetchData('/deletememberws', 'POST', token, datos);
export const wsDeleteGroup = (datos, token) => fetchData('/deletegroupws', 'POST', token, datos);

//preferents
export const preferentGet = (datos, token) => fetchData('/preferents', 'POST', token, datos);
export const preferentCreate = (datos, token) => fetchData('/preferentscreate', 'POST', token, datos);
export const preferentFilter = (datos, token) => fetchData('/preferentsfilter', 'POST', token, datos);
export const preferentDelete = (datos, token) => fetchData('/preferentdelete', 'POST', token, datos);
export const preferentUpdate = (datos, token) => fetchData('/preferentsupdate', 'POST', token, datos);
export const preferentId = (datos, token) => fetchData('/preferentsid', 'POST', token, datos);


//changeRequest
// payload.uploads[i] puede traer: { file, originDocumentation?, date?, category?, description?, labelFile? }
export const createChangeRequest = async (payload, token) => {
  const hasFiles =
    Array.isArray(payload?.uploads) &&
    payload.uploads.some(u => u?.file instanceof File);

  if (hasFiles) {
    const fd = new FormData();

    fd.append("userId", payload.userId);
    if (payload.approverId) fd.append("approverId", payload.approverId);
    if (payload.note) fd.append("note", payload.note);

    const changes = Array.isArray(payload.changes) ? payload.changes : [];
    fd.append("changes", JSON.stringify(changes));

    const uploads = payload.uploads || [];
    const uploadsMeta = uploads.map(u => {
      const isOfficial = !!u?.originDocumentation;
      return {
        originDocumentation: isOfficial ? u.originDocumentation : undefined,
        // para oficiales puedes forzar "Oficial" o dejar que el back lo infiera
        category: isOfficial ? "Oficial" : (u?.category || "Varios"),
        date: u?.date || new Date(),
        // Solo tiene sentido para “Varios”; para oficiales el back lo ignora
        description: isOfficial ? undefined : u?.description,
        labelFile:  isOfficial ? undefined : u?.labelFile,
      };
    });

    fd.append("uploadsMeta", JSON.stringify(uploadsMeta));

    uploads.forEach(u => {
      if (u?.file instanceof File) fd.append("uploads", u.file);
    });

    return fetchData("/createchangerequest", "POST", token, fd);
  }

  // sin ficheros → JSON normal
  const body = {
    userId: payload.userId,
    approverId: payload.approverId,
    note: payload.note,
    changes: Array.isArray(payload.changes) ? payload.changes : [],
  };
  return fetchData("/createchangerequest", "POST", token, body);
};
export const getmychangerequest = (datos, token) => fetchData('/getmychangerequest', 'POST', token, datos);
export const getpendingrequest = (datos, token) => fetchData('/getpendingrequest', 'POST', token, datos);
export const approvechangerequest = (datos, token) => fetchData('/approvechangerequest', 'POST', token, datos);
export const rejectchangerequest = (datos, token) => fetchData('/rejectchangerequest', 'POST', token, datos);
export const cancelchangerequest = (datos, token) => fetchData('/cancelchangerequest', 'POST', token, datos);


/* ============================
 *  Hiring (nuevos endpoints)
 * ============================ */

// Crear un periodo de contratación
export const hiringCreate = (data, token) =>
  fetchData('/hiringcreate', 'POST', token, data);

// Actualizar (patch) un periodo de contratación
export const hiringUpdate = (data, token) =>
  fetchData('/hiringupdate', 'POST', token, data);

// Cerrar un periodo (set endDate y opcionalmente active=false)
export const hiringClose = (data, token) =>
  fetchData('/hiringclose', 'POST', token, data);

// Baja lógica (active=false)
export const hiringSoftDelete = (data, token) =>
  fetchData('/hiringsoftdelete', 'POST', token, data);

// Baja física (borra Period y sus Leaves asociados)
export const hiringHardDelete = (data, token) =>
  fetchData('/hiringharddelete', 'POST', token, data);

// Listado con filtros y paginación
// body esperado: { userId?, device?, position?, category?, openOnly?, active?, dateFrom?, dateTo?, page?, limit? }
export const hiringList = (filters, token) =>
  fetchData('/hiringlist', 'POST', token, filters);

// Obtener un periodo por ID
export const hiringGetById = (data, token) =>
  fetchData('/hiringget', 'POST', token, data);

//Obetener el ultimo periodo del empleado
export const lastHiringForUser=(data, token) =>
  fetchData('/lasthiringforuser', 'POST', token, data);

/* =========================
 *  Leave (nuevos endpoints)
 * ========================= */

// Crear una excedencia/baja
export const leaveCreate = (data, token) =>
  fetchData('/leavecreate', 'POST', token, data);

// Actualizar (patch) una excedencia/baja
export const leaveUpdate = (data, token) =>
  fetchData('/leaveupdate', 'POST', token, data);

// Cerrar una excedencia/baja (set actualEndLeaveDate, active opcional)
export const leaveClose = (data, token) =>
  fetchData('/leaveclose', 'POST', token, data);

// Baja lógica (active=false) de la leave
export const leaveSoftDelete = (data, token) =>
  fetchData('/leavesoftdelete', 'POST', token, data);

// Baja física de la leave
export const leaveHardDelete = (data, token) =>
  fetchData('/leaveharddelete', 'POST', token, data);

// Listado con filtros y paginación
// body esperado: { userId?, periodId?, leaveType?, active?, openOnly?, dateFrom?, dateTo?, page?, limit? }
export const leaveList = (filters, token) =>
  fetchData('/leavelist', 'POST', token, filters);

// Obtener una leave por ID
export const leaveGetById = (data, token) =>
  fetchData('/leaveget', 'POST', token, data);
