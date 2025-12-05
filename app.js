// ===== Simple PWA app storage (localStorage) =====
const STORAGE_KEYS = {
  SERVICES: 'osteo_services_v1',
  APPTS: 'osteo_appts_v1'
};

// Default services (si no hay)
const defaultServices = [
  { id: 's1', name: 'Osteopatía general', dur: 60, price: 60 },
  { id: 's2', name: 'Masaje deportivo', dur: 50, price: 55 },
  { id: 's3', name: 'Masaje relajante', dur: 45, price: 45 },
  { id: 's4', name: 'Tratamiento cervical', dur: 30, price: 35 }
];

function read(key, fallback){
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e){ return fallback; }
}
function write(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

// Init
if(!read(STORAGE_KEYS.SERVICES)) write(STORAGE_KEYS.SERVICES, defaultServices);
if(!read(STORAGE_KEYS.APPTS)) write(STORAGE_KEYS.APPTS, []);

// UI refs
const servicesList = document.getElementById('servicesList');
const bookingSection = document.getElementById('booking');
const selectedServiceName = document.getElementById('selectedServiceName');
const bookingForm = document.getElementById('bookingForm');
const dateInput = document.getElementById('date');
const timeSelect = document.getElementById('time');
const cancelBookingBtn = document.getElementById('cancelBookingBtn');
const clientResList = document.getElementById('clientResList');

const adminBtn = document.getElementById('adminBtn');
const adminModal = document.getElementById('adminModal');
const closeAdmin = document.getElementById('closeAdmin');
const openAdminPanel = document.getElementById('openAdminPanel');
const adminPassInput = document.getElementById('adminPass');
const adminPanel = document.getElementById('adminPanel');
const adminList = document.getElementById('adminList');
const adminDate = document.getElementById('adminDate');
const adminDayList = document.getElementById('adminDayList');
const adminTotal = document.getElementById('adminTotal');
const adminActions = document.getElementById('adminActions');

let selectedService = null;

// Render services
function renderServices(){
  const services = read(STORAGE_KEYS.SERVICES, []);
  servicesList.innerHTML = '';
  services.forEach(s=>{
    const div = document.createElement('div');
    div.className = 'service';
    div.innerHTML = `<div class="left">
        <h4>${s.name}</h4>
        <p class="small">${s.dur} min • ${s.price} €</p>
      </div>
      <div>
        <button data-id="${s.id}">Reservar</button>
      </div>`;
    servicesList.appendChild(div);
    div.querySelector('button').addEventListener('click', ()=>startBooking(s.id));
  });
}

// Start booking for service
function startBooking(serviceId){
  const services = read(STORAGE_KEYS.SERVICES, []);
  selectedService = services.find(x=>x.id===serviceId);
  selectedServiceName.textContent = `${selectedService.name} — ${selectedService.dur} min • ${selectedService.price} €`;
  bookingSection.classList.remove('hidden');
  // default date today
  dateInput.value = new Date().toISOString().slice(0,10);
  populateTimesForDate(dateInput.value);
}

// Generate available time slots for a date considering 9:00-19:00 and lunch 14:00-16:00 and blocking already booked slots
function populateTimesForDate(dateStr){
  timeSelect.innerHTML = '';
  if(!selectedService) return;
  const appts = read(STORAGE_KEYS.APPTS, []);
  const duration = selectedService.dur;
  // generate slots every 15 minutes (could be adjusted)
  const startHour = 9, endHour = 19;
  const lunchStart = 14, lunchEnd = 16;
  const chosenDate = new Date(dateStr+'T00:00:00');
  const slots = [];
  for(let h=startHour; h<endHour; h++){
    if(h>=lunchStart && h<lunchEnd) continue;
    for(let m=0; m<60; m+=15){
      const d = new Date(chosenDate);
      d.setHours(h, m, 0, 0);
      // if start + duration extends beyond endHour or into lunch, skip
      const end = new Date(d.getTime() + duration*60000);
      if(end.getHours()>=endHour || ( (d.getHours()<lunchStart && end.getHours()>=lunchStart) ) ) continue;
      // check booked overlap
      const conflict = appts.some(a=>{
        if(a.serviceId===undefined) return false;
        if(a.date !== dateStr) return false;
        const sStart = new Date(a.date + 'T' + a.time);
        const sEnd = new Date(sStart.getTime() + a.dur*60000);
        return !(end <= sStart || d >= sEnd);
      });
      if(!conflict && d >= new Date()) { // only future slots
        const hh = String(d.getHours()).padStart(2,'0');
        const mm = String(d.getMinutes()).padStart(2,'0');
        slots.push(`${hh}:${mm}`);
      }
    }
  }
  if(slots.length===0){
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No hay huecos libres';
    timeSelect.appendChild(opt);
  } else {
    slots.forEach(s=>{
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      timeSelect.appendChild(opt);
    });
  }
}

// booking submit
bookingForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const date = dateInput.value;
  const time = timeSelect.value;
  const fullname = document.getElementById('fullname').value.trim();
  const address = document.getElementById('address').value.trim();
  const town = document.getElementById('town').value.trim();
  const phone = document.getElementById('phone').value.trim();
  if(!date || !time || !fullname || !address || !town || !phone){ alert('Rellena todos los campos obligatorios'); return; }
  // double-check slot still available
  const appts = read(STORAGE_KEYS.APPTS, []);
  const newAppt = {
    id: 'a_' + Date.now(),
    date, time,
    fullname, address, town, phone,
    serviceId: selectedService.id,
    serviceName: selectedService.name,
    dur: selectedService.dur,
    price: selectedService.price,
    createdAt: new Date().toISOString()
  };
  // check conflict
  const conflict = appts.some(a=>{
    if(a.date !== date) return false;
    const sStart = new Date(a.date + 'T' + a.time);
    const sEnd = new Date(sStart.getTime() + a.dur*60000);
    const nStart = new Date(date + 'T' + time);
    const nEnd = new Date(nStart.getTime() + newAppt.dur*60000);
    return !(nEnd <= sStart || nStart >= sEnd);
  });
  if(conflict){ alert('Lo siento, el hueco ya fue reservado. Elige otro.'); populateTimesForDate(date); return; }
  appts.push(newAppt);
  write(STORAGE_KEYS.APPTS, appts);
  alert('Reserva guardada correctamente');
  bookingSection.classList.add('hidden');
  bookingForm.reset();
  selectedService = null;
  renderClientReservations();
});

// cancel booking UI
cancelBookingBtn.addEventListener('click', ()=>{
  bookingSection.classList.add('hidden');
  selectedService = null;
});

// date change -> repopulate times
dateInput.addEventListener('change', ()=>populateTimesForDate(dateInput.value));

// client reservations (list and allow cancel)
function renderClientReservations(){
  const appts = read(STORAGE_KEYS.APPTS, []);
  // show only future and all stored
  clientResList.innerHTML = '';
  if(appts.length===0){ clientResList.textContent = 'No tienes reservas'; return; }
  // show by this phone? We do not have auth, so show all with cancel link per entry (in a real app, you'd confirm identity)
  appts.sort((a,b)=> new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
  appts.forEach(a=>{
    const div = document.createElement('div');
    div.className = 'resItem';
    div.innerHTML = `<div>
        <strong>${a.serviceName}</strong><div class="small">${a.date} ${a.time} • ${a.town}</div>
        <div class="small">${a.fullname} • ${a.phone}</div>
      </div>
      <div>
        <button data-id="${a.id}" class="cancelBtn">Anular</button>
      </div>`;
    clientResList.appendChild(div);
  });
  // add events to cancel buttons (confirm)
  clientResList.querySelectorAll('.cancelBtn').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.getAttribute('data-id');
      if(!confirm('¿Confirmas anular esta cita?')) return;
      let appts = read(STORAGE_KEYS.APPTS, []);
      appts = appts.filter(x=>x.id!==id);
      write(STORAGE_KEYS.APPTS, appts);
      renderClientReservations();
      renderAdminList();
    });
  });
}

// ADMIN modal handling
adminBtn.addEventListener('click', ()=>{
  adminModal.classList.remove('hidden');
});
closeAdmin.addEventListener('click', ()=> adminModal.classList.add('hidden'));

// open admin panel (password protected: 2580)
openAdminPanel.addEventListener('click', ()=>{
  const pass = adminPassInput.value;
  if(pass === '2580'){
    adminPanel.classList.remove('hidden');
    adminActions.classList.add('hidden'); // hide the login
    renderAdminList();
  } else {
    alert('Contraseña incorrecta');
  }
});

// show admin list: upcoming -> far, grouped by poblacion visually
function renderAdminList(){
  const appts = read(STORAGE_KEYS.APPTS, []);
  // sort ascending by date/time
  appts.sort((a,b)=> new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time));
  adminList.innerHTML = '';
  if(appts.length===0){ adminList.textContent = 'No hay citas'; }
  // group by town
  const grouped = appts.reduce((acc, cur)=>{
    acc[cur.town] = acc[cur.town] || [];
    acc[cur.town].push(cur);
    return acc;
  }, {});
  Object.keys(grouped).sort().forEach(town=>{
    const header = document.createElement('h4'); header.textContent = town; adminList.appendChild(header);
    grouped[town].forEach(a=>{
      const div = document.createElement('div');
      div.className = 'adminItem';
      div.innerHTML = `<div>
          <strong>${a.serviceName}</strong>
          <div class="small">${a.date} ${a.time} • ${a.fullname} • ${a.phone}</div>
        </div>
        <div>
          <button data-id="${a.id}" class="editBtn">Editar</button>
          <button data-id="${a.id}" class="delBtn">Borrar</button>
        </div>`;
      adminList.appendChild(div);
    });
  });
  // edit handlers: simple prompt to change date/time
  adminList.querySelectorAll('.editBtn').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.getAttribute('data-id');
      let appts = read(STORAGE_KEYS.APPTS, []);
      const a = appts.find(x=>x.id===id);
      const newDate = prompt('Nueva fecha (YYYY-MM-DD):', a.date);
      if(!newDate) return;
      const newTime = prompt('Nueva hora (HH:MM):', a.time);
      if(!newTime) return;
      a.date = newDate; a.time = newTime;
      write(STORAGE_KEYS.APPTS, appts);
      renderAdminList();
      renderClientReservations();
    });
  });
  adminList.querySelectorAll('.delBtn').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.getAttribute('data-id');
      if(!confirm('Borrar esta cita?')) return;
      let appts = read(STORAGE_KEYS.APPTS, []);
      appts = appts.filter(x=>x.id!==id);
      write(STORAGE_KEYS.APPTS, appts);
      renderAdminList();
      renderClientReservations();
    });
  });
}

// admin day view
adminDate.addEventListener('change', ()=>{
  const d = adminDate.value;
  const appts = read(STORAGE_KEYS.APPTS, []).filter(a=>a.date === d).sort((a,b)=> a.time.localeCompare(b.time));
  adminDayList.innerHTML = '';
  if(appts.length===0) adminDayList.textContent = 'No hay citas ese día';
  let total = 0;
  appts.forEach(a=>{
    total += Number(a.price || 0);
    const div = document.createElement('div');
    div.className = 'resItem';
    div.innerHTML = `<div><strong>${a.time} • ${a.serviceName}</strong><div class="small">${a.fullname} • ${a.town}</div></div>
      <div><button data-id="${a.id}" class="delDayBtn">Borrar</button></div>`;
    adminDayList.appendChild(div);
  });
  adminTotal.textContent = `${total} €`;
  adminDayList.querySelectorAll('.delDayBtn').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.getAttribute('data-id');
      if(!confirm('Borrar esta cita?')) return;
      let appts = read(STORAGE_KEYS.APPTS, []);
      appts = appts.filter(x=>x.id!==id);
      write(STORAGE_KEYS.APPTS, appts);
      adminDate.dispatchEvent(new Event('change'));
      renderAdminList();
      renderClientReservations();
    });
  });
});

// initial render
renderServices();
renderClientReservations();
