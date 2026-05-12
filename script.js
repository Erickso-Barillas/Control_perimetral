const dbName = "RondasDB";
let db;
let listaFotos = [];

// 1. INICIALIZAR BASE DE DATOS
const request = indexedDB.open(dbName, 2);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("registros")) {
        db.createObjectStore("registros", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    console.log("Base de datos conectada");
    if(document.getElementById('lista-registros')) cargarHistorial();
};

const getFechaLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 2. GENERADOR DE RONDAS
document.getElementById('btnGenerar').addEventListener('click', function() {
    const btn = this;
    btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> ANALIZANDO...`;
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        generarHorariosLogica();
        btn.innerHTML = `<i data-lucide="refresh-cw"></i> REGENERAR`;
        if (window.lucide) lucide.createIcons();
    }, 1200);
});

function generarHorariosLogica() {
    const bloques = [
        { n: "MAÑANA", min: 7, max: 11, icon: "sun" },
        { n: "TARDE", min: 13, max: 17, icon: "cloud-sun" },
        { n: "NOCHE", min: 20, max: 23, icon: "moon" }
    ];
    const container = document.getElementById('horarios-lista');
    container.innerHTML = "";

    bloques.forEach(b => {
        let h = Math.floor(Math.random() * (b.max - b.min + 1) + b.min);
        let m = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        let time = `${h.toString().padStart(2, '0')}:${m}`;
        
        const card = document.createElement('div');
        card.className = 'ronda-card active';
        card.innerHTML = `
            <div class="ronda-info">
                <span class="label"><i data-lucide="${b.icon}" size="12"></i> Bloque ${b.n}</span>
                <span class="time">${time} HRS</span>
            </div>
            <div class="ronda-actions">
                <button onclick="iniciarRonda('${time}')" class="btn-reg">REGISTRAR</button>
            </div>
        `;
        container.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
}

// 3. NAVEGACIÓN
function showSection(sectionId) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(sectionId === 'dashboard') document.getElementById('nav-dash').classList.add('active');
    if(sectionId === 'historial') {
        document.getElementById('nav-hist').classList.add('active');
        cargarHistorial();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Siempre arriba al cambiar sección
    if (window.lucide) lucide.createIcons();
}

function iniciarRonda(h) {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('registro').classList.remove('hidden');
    document.getElementById('ronda-titulo').innerText = "Registro Hora: " + h;
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Subir al formulario
}

// 4. CAPTURA DE FOTOS
document.getElementById('foto-input').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
            listaFotos.push(reader.result);
            actualizarPrevisualizacionCaptura();
        };
        reader.readAsDataURL(file);
    });
    e.target.value = ""; 
});

function actualizarPrevisualizacionCaptura() {
    const container = document.getElementById('preview-container');
    container.innerHTML = ""; 
    listaFotos.forEach((foto, index) => {
        const imgWrapper = document.createElement('div');
        imgWrapper.style.cssText = "position:relative; display:inline-block; margin:5px;";
        imgWrapper.innerHTML = `
            <img src="${foto}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; border:2px solid #334155;">
            <button onclick="eliminarFoto(${index})" style="position:absolute; top:-5px; right:-5px; width:24px; height:24px; background:#ef4444; border-radius:50%; color:white; border:none; font-weight:bold; cursor:pointer;">×</button>
        `;
        container.appendChild(imgWrapper);
    });
}

function eliminarFoto(index) {
    listaFotos.splice(index, 1);
    actualizarPrevisualizacionCaptura();
}

// 5. GUARDADO
document.getElementById('btnGuardar').addEventListener('click', () => {
    if(listaFotos.length === 0) return alert("Captura al menos una foto de evidencia.");
    
    const hoy = new Date();
    const registro = {
        fechaBusqueda: getFechaLocal(),
        fechaPantalla: hoy.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora: hoy.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        tipo: document.getElementById('tipo-ronda').value,
        obs: document.getElementById('obs').value,
        fotos: [...listaFotos]
    };

    const tx = db.transaction("registros", "readwrite");
    tx.objectStore("registros").add(registro);
    tx.oncomplete = () => {
        alert("✓ Registro guardado.");
        limpiarFormulario();
        showSection('dashboard');
    };
});

function limpiarFormulario() {
    listaFotos = [];
    document.getElementById('preview-container').innerHTML = "";
    document.getElementById('obs').value = "";
    document.getElementById('registro').classList.add('hidden');
}

// 6. HISTORIAL
function cargarHistorial(fechaFiltro = null) {
    const listado = document.getElementById('lista-registros');
    if (!listado) return;

    listado.innerHTML = "<div style='text-align:center; padding:40px;'><i data-lucide='loader-2' class='spin'></i></div>";
    if (window.lucide) lucide.createIcons();

    const tx = db.transaction("registros", "readonly");
    const store = tx.objectStore("registros");
    
    store.getAll().onsuccess = (e) => {
        let datos = e.target.result;
        datos.sort((a, b) => b.id - a.id);
        if (fechaFiltro) datos = datos.filter(d => d.fechaBusqueda === fechaFiltro);

        listado.innerHTML = ""; 
        if (datos.length === 0) {
            listado.innerHTML = `<p style="text-align:center; padding:50px; color:#64748b;">No hay registros.</p>`;
            return;
        }

        const grupos = {};
        datos.forEach(reg => {
            if (!grupos[reg.fechaPantalla]) grupos[reg.fechaPantalla] = [];
            grupos[reg.fechaPantalla].push(reg);
        });

        Object.keys(grupos).forEach(fecha => {
            const contenedorDia = document.createElement('div');
            contenedorDia.className = 'dia-grupo';
            contenedorDia.innerHTML = `
                <div class='dia-header'>
                    <h3>${fecha}</h3>
                    <span class='dia-count'>${grupos[fecha].length}</span>
                </div>`;

            const listaRegistros = document.createElement('div');
            listaRegistros.className = 'dia-contenido';

            grupos[fecha].forEach(reg => {
                const card = document.createElement('div');
                card.className = 'card-historial';
                card.onclick = () => verDetalleRonda(reg);
                card.innerHTML = `
                    <div class="hist-img-container"><img src="${reg.fotos[0]}" loading="lazy"></div>
                    <div class="info-mini">
                        <span class="hist-time">${reg.hora}</span>
                        <span class="hist-type">${reg.tipo}</span>
                        <small><i data-lucide="camera" size="10"></i> ${reg.fotos.length} fotos</small>
                    </div>`;
                listaRegistros.appendChild(card);
            });
            contenedorDia.appendChild(listaRegistros);
            listado.appendChild(contenedorDia);
        });
        if (window.lucide) lucide.createIcons();
    };
}

// 7. DETALLES
function verDetalleRonda(reg) {
    const modal = document.getElementById('modal-foto');
    const modalContent = document.getElementById('modal-content');
    const caption = document.getElementById('caption');
    
    modal.style.display = "flex";
    modal.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    modalContent.innerHTML = "";
    const galeria = document.createElement('div');
    galeria.className = "modal-galeria";
    galeria.style.cssText = "width:100%; display:flex; flex-direction:column; align-items:center; gap:15px; padding:15px 0;";

    // Fotos con ancho 90%
    reg.fotos.forEach(f => {
        const imgContainer = document.createElement('div');
        imgContainer.style.cssText = `
            width: 80%;
            height: 250px; 
            border-radius: 12px;
            overflow: hidden;
            border: 2px solid #334155;
            background: #000;
        `;
        const img = document.createElement('img');
        img.src = f;
        img.style.cssText = "width:100%; height:100%; object-fit:cover;";
        imgContainer.appendChild(img);
        galeria.appendChild(imgContainer);
    });

    // CUADRO DE INFORMACIÓN: Ahora con ancho 90% para igualar a las fotos
    const infoBox = document.createElement('div');
    infoBox.className = "modal-info-box";
    infoBox.style.cssText = "width: 70%; margin: 0 auto;"; // Centrado y mismo ancho
    infoBox.innerHTML = `
        <div style="border-left:4px solid #38bdf8; padding-left:12px; margin-bottom:15px;">
            <span style="display:block; font-size:0.7rem; color:#38bdf8; text-transform:uppercase; font-weight:bold;">Tipo de Inspección</span>
            <strong style="color:#f8fafc; font-size:1.1rem;">${reg.tipo}</strong>
        </div>
        <div style="background:#0f172a; padding:12px; border-radius:8px; border:1px solid #334155;">
            <strong style="color:#38bdf8; font-size:0.8rem; display:block; margin-bottom:5px;">OBSERVACIONES TÉCNICAS:</strong>
            <p style="color:#cbd5e1; font-size:0.95rem; margin:0; line-height:1.5;">${reg.obs || "Sin novedades adicionales."}</p>
        </div>
    `;
    
    modalContent.appendChild(galeria);
    modalContent.appendChild(infoBox);
    caption.innerHTML = `<div style="color:#94a3b8; font-size:0.8rem; text-align:center; margin:15px 0;">Registro: ${reg.fechaPantalla} - ${reg.hora}</div>`;
}

function cerrarModal() {
    const modal = document.getElementById('modal-foto');
    modal.style.display = "none";
    modal.classList.add('hidden');
}

// ESCUCHADOR PARA EL FILTRO DE FECHA
document.addEventListener('DOMContentLoaded', () => {
    const filtroFecha = document.getElementById('filtro-fecha');
    if (filtroFecha) {
        filtroFecha.addEventListener('change', (e) => {
            const fechaSeleccionada = e.target.value; // Esto devuelve AAAA-MM-DD
            console.log("Filtrando por:", fechaSeleccionada);
            cargarHistorial(fechaSeleccionada);
        });
    }
});

function actualizarFecha() {
    const fechaElemento = document.getElementById('current-date');
    const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
    const hoy = new Date();
    
    // Convertir a formato: "Lunes, 11 de mayo"
    let fechaFormateada = hoy.toLocaleDateString('es-ES', opciones);
    
    // Capitalizar la primera letra (opcional)
    fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    
    fechaElemento.textContent = fechaFormateada;
}

// Ejecutar la función al cargar la página
document.addEventListener('DOMContentLoaded', actualizarFecha);