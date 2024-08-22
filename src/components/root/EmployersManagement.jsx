import { useState } from "react";
import { createEmployer, getEmployers } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

const EmployersManagement = ({ charge }) => {
    const [pass, setPass] = useState('');
    const [role, setRole] = useState('user');
    const [firstName, setFirstName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [dni, setDni]=useState('')

    const createUser = async () => {
        charge(true)
        const userData = {
            pass:pass,
            role:role,
            firstName:firstName,
            phone:phone,
            email:email,
            dni:dni
        };
        const token=getToken();
        const userAux = await createEmployer(userData, token)
        charge(false)
    }


    return (
        <div>
            <div>
                <label>Password:</label>
                <input
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Role:</label>
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                >
                    <option value="global">Global</option>
                    <option value="root">Root</option>
                    <option value="auditor">Auditor</option>
                    <option value="employer">Employer</option>
                    <option value="responsable">Responsable</option>
                </select>
            </div>
            <div>
                <label>Email:</label>
                <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Nombre:</label>
                <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>Teléfono:</label>
                <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                />
            </div>
            <div>
                <label>DNI:</label>
                <input
                    type="text"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    required
                />
            </div>
            <button onClick={()=>createUser()}>Crear usuario</button>
        </div>
    );
};

export default EmployersManagement;