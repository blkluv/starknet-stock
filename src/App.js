import React, { useEffect, useMemo, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";

// Local storage helpers
const STORAGE_KEY = "starknet_stock_app";
const CAM_KEY = "starknet_stock_camId";

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

// Initial seed data
const seed = {
  inventory: [],
  movements: [],
  settings: {
    categories: ["Cámaras","Routers","Switches","Fibra Óptica","Antenas","Accesorios","Otros"],
    people: ["Cliente A","Cliente B","Juan Pérez","María López","Equipo Técnico"],
    users: [{ name:"Fabricio", pin:"1234" }, { name:"Matias", pin:"2345" }, { name:"Daniele", pin:"3456" }],
  },
};

function toDateInputValue(date) {
  const d=new Date(date);
  const pad=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// ✅ Keep only ONE App
export default function App() {
  const [data,setData] = useLocalStorage(STORAGE_KEY, seed);
  const [tab,setTab] = useState("ingreso");
  const [currentUser, setCurrentUser] = useState("Fabricio");

  const handleUserChange = (next) => {
    const u = data.settings.users.find(x=>x.name===next);
    const entered = window.prompt(`Ingresá el PIN de ${next}`);
    if(!u) return alert("Usuario inválido");
    if(entered === u.pin){ setCurrentUser(next); } else { alert("PIN incorrecto"); }
  };

  const inventoryBySerial = useMemo(()=>{ 
    const m=new Map(); 
    data.inventory.forEach(it=>m.set(it.serial.trim(),it)); 
    return m; 
  },[data.inventory]);

  const registerIngreso = ({ date, serial, product, category, qty, location, responsible, notes }) => {
    setData((d) => {
      const exists = d.inventory.find((i) => i.serial.trim() === (serial||"").trim());
      let inventory;
      if (exists) {
        inventory = d.inventory.map((i) => i.serial.trim() === (serial||"").trim()
          ? { ...i, product: i.product || product, category: i.category || category, location: location || i.location, stock: (Number(i.stock || 0) + Number(qty || 0)) }
          : i);
      } else {
        inventory = [ ...d.inventory, { serial, product, category, stock: Number(qty || 0), location, notes: notes || "" } ];
      }
      const movements = [ ...d.movements, { date, serial, product, person:"INGRESO MATERIAL", qty:Number(qty||0), responsible:responsible||"", notes:notes||"", type:"Ingreso", user: currentUser } ];
      return { ...d, inventory, movements };
    });
  };

  const addMovement = (mov) => {
    const productName = mov.product?.trim() || inventoryBySerial.get(mov.serial)?.product || "";
    const newMov = { ...mov, product: productName, type: mov.type || "Entrega", user: currentUser };
    setData((d) => {
      const movements = [...d.movements, newMov];
      let inv = d.inventory;
      if (newMov.type === "Entrega") { inv = d.inventory.map((it) => it.serial === mov.serial ? { ...it, stock: Math.max(0, (+it.stock||0) - (+mov.qty||0)) } : it ); }
      if (newMov.type === "Devolución") { inv = d.inventory.map((it) => it.serial === mov.serial ? { ...it, stock: (+it.stock||0) + (+mov.qty||0) } : it ); }
      return { ...d, movements, inventory: inv };
    });
  };

  return (
    <div style={{minHeight:'100vh', background:'var(--gray)'}}>
      <div className="container">
        <div className="header">
          <div className="brand">
            <img src="/logo-starknet.png" className="logo" alt="STARKNET"/>
            <div><strong>STARKNET</strong><div className="badge">INTERNET EN EL AIRE</div></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:13,color:'#475569'}}>Usuario</span>
            <select className="input" value={currentUser} onChange={(e)=>handleUserChange(e.target.value)}>
              {data.settings.users.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{display:'flex',gap:8,margin:'10px 0'}}>
          {["inventario","ingreso","movimientos","reportes","ajustes"].map(t=>(
            <button key={t} className={`btn ${tab===t?"btn-primary":"btn-ghost"}`} onClick={()=>setTab(t)}>
              {t[0].toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {tab==="inventario" && <div className="card">Inventario UI aquí</div>}
        {tab==="ingreso" && <Ingreso categories={data.settings.categories} registerIngreso={registerIngreso}/>}
        {tab==="movimientos" && <Movements movements={data.movements} addMovement={addMovement}/>}
        {tab==="reportes" && <div className="card">Reportes UI aquí</div>}
        {tab==="ajustes" && <div className="card">Ajustes UI aquí</div>}

        <div className="footer">© StarkNet</div>
      </div>
    </div>
  );
}