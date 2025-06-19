import React from 'react';
import { FaTrashAlt, FaUserPlus, FaFolderPlus } from 'react-icons/fa';
import styles from '../styles/ManagingWorkspace.module.css';

export default function Tree({
  node,
  level = 0,
  onOpen,
  openSubs,
  onAddMember,
  onRemoveUser,
  onRemoveGroup,
  onCreateSub,
  allowCreate = true
}) {
  const key = node.id || node.email;
  const info = openSubs[key];
  const open = !!info;

  return (
    <li className={styles.treeNode}>
      {/* etiqueta clicable */}
      <span
        className={styles.treeLabel}
        style={{ fontWeight: level === 0 ? 700 : 400 }}
        onClick={() => onOpen(node)}
      >
        {node.email}
      </span>

      {/* + y papelera */}
      {/* ➕  miembros */}
      <FaUserPlus className={`${styles.iconBtn} ${styles.iconPlus}`}
        onClick={() => onAddMember(node)} />

      {allowCreate && (
        <FaFolderPlus
          className={`${styles.iconBtn} ${styles.iconPlus}`}
          onClick={() => onCreateSub(node)}
        />
      )}

      {/* 🗑  borrar */}
      <FaTrashAlt className={styles.iconBtn}
        onClick={() => onRemoveGroup(node)} />

      {/* usuarios y sub-grupos */}
      {open && (
        <>
          {/* usuarios */}
          {info.miembros
            .filter(m => m.type === 'USER')
            .map(u => (
              <span key={u.email} className={styles.userPill}>
                {u.email}
                <button onClick={() => onRemoveUser(u.email, node)}>✖</button>
              </span>
            ))}

          {/* sub-grupos */}
          <ul className={styles.fatherTree}>
            {info.miembros
              .filter(m => m.type === 'GROUP')
              .map(sub => (
                <Tree
                  key={sub.id || sub.email}
                  node={sub}
                  level={level + 1}
                  onOpen={onOpen}
                  openSubs={openSubs}
                  onAddMember={onAddMember}
                  onRemoveUser={onRemoveUser}
                  onRemoveGroup={onRemoveGroup}
                  allowCreate={false}
                />
              ))}
          </ul>
        </>
      )}
    </li>
  );
}
