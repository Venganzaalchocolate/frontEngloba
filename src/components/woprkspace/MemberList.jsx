
import { FaTrashAlt } from 'react-icons/fa';
import styles from '../styles/ManagingWorkspace.module.css';


export default function MemberList({ members, onDelete }) {
  return (
    <ul className={styles.memberList}>
      {members.map(member => (
        <li key={member.email} className={styles.memberItem}>
          <span className={styles.email}>{member.email}</span>
            <FaTrashAlt onClick={() => onDelete(member.email)}/>
        </li>
      ))}
    </ul>
  );
}

// Ejemplo de uso:
// <MemberList
//    members={[{ email: 'a@b.com' }, { email: 'c@d.com' }]}
//    onDelete={email => handleDelete(email)}
// />
