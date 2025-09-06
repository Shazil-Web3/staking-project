const BackgroundOrbs = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="orb orb-1 w-96 h-96 top-20 -left-20" />
      <div className="orb orb-2 w-80 h-80 top-60 right-10" />
      <div className="orb orb-3 w-72 h-72 bottom-40 left-1/3" />
      <div className="orb orb-1 w-64 h-64 bottom-20 -right-10" />
      <div className="orb orb-2 w-56 h-56 top-1/3 left-10" />
    </div>
  );
};

export default BackgroundOrbs;
