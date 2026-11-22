const URL_MI_SERVER = 'http://localhost:5252/api/partidos';
const contenedor = document.getElementById('contenedor-partidos');
const selectorFecha = document.getElementById('selector-fecha');

const LIGAS_RELEVANTES = [
    2,    // Champions League
    3,    // Europa League
    39,   // Premier League
    140,  // La Liga
    135,  // Serie A (Italia)
    78,   // Bundesliga
    61,   // Ligue 1
    128,  // Primera División Argentina
    13,   // Copa Libertadores
    11,   // Copa Sudamericana
];

// ARMAR FECHAS
function obtenerFechaFormateada(diasDiferencia) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + diasDiferencia);

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');

    return {
        paraApi: `${anio}-${mes}-${dia}`,     // Ej: 2026-11-22 (lo que entiende API-Football)
        paraMostrar: `${dia}/${mes}/${anio}`  // Ej: 22/11/2026 (lo que ve el usuario)
    };
}

function inicializarDesplegable() {
    const opciones = [
        { texto: 'Ayer', fecha: obtenerFechaFormateada(-1), defecto: false },
        { texto: 'Hoy', fecha: obtenerFechaFormateada(0), defecto: true },
        { texto: 'Mañana', fecha: obtenerFechaFormateada(1), defecto: false }
    ];

    opciones.forEach(op => {
        const option = document.createElement('option');
        option.value = op.fecha.paraApi;
        option.textContent = `${op.texto} (${op.fecha.paraMostrar})`;
        option.selected = op.defecto;
        selectorFecha.appendChild(option);
    });
}
// ----------------------------------------------------------------

function prioridadEstado(estado) {
    if (["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "LIVE"].includes(estado)) {
        return 0;
    }
    if (estado === "NS" || estado === "TBD") {
        return 1;
    }
    return 2;
}

// Ahora cargarPartidos recibe la fecha elegida
function cargarPartidos(fechaSeleccionada) {
    contenedor.innerHTML = "<p>Cargando partidos...</p>";

    //  se manda la fecha por la url al servidor
    fetch(`${URL_MI_SERVER}?fecha=${fechaSeleccionada}`)
        .then(respuesta => {
            if (!respuesta.ok) {
                throw new Error("No se pudo conectar con el servidor .NET");
            }
            return respuesta.json();
        })
        .then(datos => {
            console.log("Datos recibidos desde .NET:", datos);
            contenedor.innerHTML = "";

            const listaPartidos = datos.response;

            if (!listaPartidos) {
                contenedor.innerHTML = "<p>Error de la API: " + JSON.stringify(datos) + "</p>";
                return;
            }

            const partidosFiltrados = listaPartidos.filter(item =>
                LIGAS_RELEVANTES.includes(item.league.id)
            );

            if (partidosFiltrados.length === 0) {
                contenedor.innerHTML = "<p>No hay partidos programados para esta fecha.</p>";
                return;
            }

            partidosFiltrados.sort((a, b) => {
                return prioridadEstado(a.fixture.status.short) - prioridadEstado(b.fixture.status.short);
            });

            partidosFiltrados.forEach(item => {
                const equipoLocal = item.teams.home.name;
                const escudoLocal = item.teams.home.logo;
                const equipoVisitante = item.teams.away.name;
                const escudoVisitante = item.teams.away.logo;

                const liga = item.league.name;
                const estado = item.fixture.status.short;
                const minuto = item.fixture.status.elapsed;

                let textoEstado = "";
                let claseExtra = "";

                if (estado === "NS" || estado === "TBD") {
                    const horaPartido = new Date(item.fixture.date)
                        .toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                    textoEstado = `${horaPartido} hs`;
                    claseExtra = "no-comenzado";
                } else if (estado === "FT" || estado === "AET" || estado === "PEN") {
                    textoEstado = "Finalizado";
                    claseExtra = "finalizado";
                } else if (estado === "HT") {
                    textoEstado = "Entretiempo";
                    claseExtra = "en-vivo";
                } else {
                    textoEstado = `Minuto ${minuto ?? 0}'`;
                    claseExtra = "en-vivo";
                }

                // Aca se muiestra el resultado una vez terminado el partido
                const partidoTerminado = ["FT", "AET", "PEN"].includes(estado);
                const textoMarcador = partidoTerminado 
                    ? `${item.goals.home} - ${item.goals.away}` 
                    : "VS";

                const tarjetaHTML = `
                    <div class="tarjeta-partido ${claseExtra}">
                        <p class="liga">${liga} - ${textoEstado}</p>
                        <div class="marcador">
                            <div class="equipo">
                                <img src="${escudoLocal}" alt="${equipoLocal}" width="30">
                                <span>${equipoLocal}</span>
                            </div>
                            <span class="goles">${textoMarcador}</span>
                            <div class="equipo">
                                <img src="${escudoVisitante}" alt="${equipoVisitante}" width="30">
                                <span>${equipoVisitante}</span>
                            </div>
                        </div>
                    </div>
                `;

                contenedor.innerHTML += tarjetaHTML;
            });
        })
        .catch(error => {
            console.error("Hubo un problema:", error);
            contenedor.innerHTML = "<p>Servidor .NET no disponible</p>";
        });
}

// Cuando el usuario cambia la opcion del desplegable, recargamos los partidos
selectorFecha.addEventListener('change', (evento) => {
    cargarPartidos(evento.target.value);
});

// Arrancamos la página
inicializarDesplegable();
cargarPartidos(selectorFecha.value);