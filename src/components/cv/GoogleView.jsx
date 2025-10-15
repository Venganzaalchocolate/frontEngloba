const VisualizadorPDF = ({ url }) => {
  return (
    <div style={{ width: '100%', height: '80vh' }}>
      {url ? (
        <embed
          src={url}                 // URL presignada directa
          type="application/pdf"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      ) : (
        <div>Sin documento</div>
      )}
    </div>
  );
};

export default VisualizadorPDF;
