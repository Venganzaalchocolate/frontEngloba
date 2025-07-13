import styles from '../styles/paginacion.module.css';

const PageLimit=({limit, handleLimitChange, page, totalPages, handlePageChange})=>{
    return <div className={styles.paginacion}>
                    <label htmlFor="limit">Usuarios por página:</label>
                    <select id="limit" value={limit} onChange={handleLimitChange}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                    <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                        {'<'}
                    </button>
                    <span>Página {page}</span>
                    <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
                        {'>'}
                    </button>

                </div>
}

export default PageLimit;