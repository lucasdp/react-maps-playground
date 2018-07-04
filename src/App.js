import React, { Component } from 'react';
import './App.css';
import isPip from 'robust-point-in-polygon';

import ReactMapboxGl, { Layer, GeoJSONLayer, Feature } from 'react-mapbox-gl';
import geojson from './geojson.json';
import zona2 from './zona2.json';

import { setRTLTextPlugin } from 'mapbox-gl';

let gjLocal = { ...geojson };
let zona2Local = { ...zona2 };

// parse coordenadas

zona2Local.features[0].geometry.coordinates = JSON.parse(
  zona2Local.features[0].geometry.coordinates,
);
const Map = ReactMapboxGl({
  accessToken:
    'pk.eyJ1IjoibHVjYXNkcCIsImEiOiJjaml2dXNiaGswY3NpM2tvc3k2YzR1YWt5In0.qco86APyc1wZPEOt9ZcbeA',
});

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      punto: null,
      calle: '',
      numero: '',
      dragging: false,
      movingDot: -1,
      centerMap: [-68.0606966, -38.951769],
    };
  }

  onStyleLoad = map => {
    const { onStyleLoad } = this.props;
    return onStyleLoad && onStyleLoad(map);
  };

  onMouseUp = (map, evt) => {
    if (this.state.dragging) {
      this.setState({
        dragging: false,
      });
    }
  };
  onStopDrag = (map, evt) => {
    // this.setState({ dragging: false });
  };

  logEvent = evt => {
    console.log(evt);
  };

  onMouseMove = (map, evt) => {
    if (!this.state.dragging) {
      return false;
    }

    evt.preventDefault();

    const cantidadDePuntos = gjLocal.features[0].geometry.coordinates[0].length;

    if (this.state.movingDot !== -1 && this.state.movingDot !== 0) {
      gjLocal.features[0].geometry.coordinates[0][this.state.movingDot] = [
        evt.lngLat.lng,
        evt.lngLat.lat,
      ];
      map.getSource('zona-1').setData(gjLocal);
    }

    // El primer punto siempre se debe repetir con el ultimo
    if (this.state.movingDot === 0 || this.state.movingDot === cantidadDePuntos - 1) {
      gjLocal.features[0].geometry.coordinates[0][0] = [evt.lngLat.lng, evt.lngLat.lat];
      gjLocal.features[0].geometry.coordinates[0][cantidadDePuntos - 1] = [
        evt.lngLat.lng,
        evt.lngLat.lat,
      ];

      map.getSource('zona-1').setData(gjLocal);
    }
  };

  ordenarArray() {
    const pointsArray = geojson.features[0].geometry.coordinates[0];
    console.log(pointsArray);

    // find center
    let cent = findCenter(pointsArray);

    // find angles
    findAngles(cent, pointsArray);

    // sort based on angle using custom sort
    pointsArray.sort(function(a, b) {
      return a.angle >= b.angle ? 1 : -1;
    });

    console.log('pointsArray ordenados');
    console.log(pointsArray);

    function findCenter(points) {
      let i,
        x = 0,
        y = 0,
        len = points.length;
      for (i = 0; i < len; i++) {
        x += points[i][0];
        y += points[i][1];
      }
      return [x / len, y / len]; // return average position
    }

    function findAngles(c, points) {
      let i,
        len = points.length,
        p,
        dx,
        dy;
      for (i = 0; i < len; i++) {
        p = points[i];
        dx = p[0] - c[0];
        dy = p[1] - c[1];
        p.angle = Math.atan2(dy, dx);
      }
    }
  }

  onMouseDown = (map, evt) => {
    // evt.preventDefault();

    // Si no es clic derecho
    if (evt.originalEvent.button !== 2) {
      return;
    }

    const cantidadDePuntos = gjLocal.features[0].geometry.coordinates[0].length;

    // Elimino el ultimo punto, que siempre es igual que el primero
    gjLocal.features[0].geometry.coordinates[0].splice(cantidadDePuntos - 1, 1);

    // Si fué con ctrl
    if (evt.originalEvent.ctrlKey) {
      // buscar punto mas cercano
      // ToDo : deberia poner limites
      const index = this.buscarMasCercano(evt);

      // eliminar punto
      gjLocal.features[0].geometry.coordinates[0].splice(index, 1);
    } else {
      // Agrego el nuevo Punto
      gjLocal.features[0].geometry.coordinates[0].push([evt.lngLat.lng, evt.lngLat.lat]);
    }

    // Ordenar los puntos
    this.ordenarArray();

    // El primer punto siempre es el ultimo
    const primerPunto = gjLocal.features[0].geometry.coordinates[0][0];
    gjLocal.features[0].geometry.coordinates[0].push(primerPunto);

    // actualizar el mapa
    map.getSource('zona-1').setData(gjLocal);
  };

  buscarMasCercano(evt) {
    const toRadians = angle => {
      return angle * (Math.PI / 180);
    };

    const lat1 = evt.lngLat.lat;
    const lng1 = evt.lngLat.lng;
    const lat1Radians = toRadians(lat1);
    const R = 6371e3;
    let dists = [];
    let masCerca = 99999;
    let masCercaIndex = -1;

    geojson.features[0].geometry.coordinates[0].forEach((coor, index) => {
      const lat2 = coor[1];
      const lng2 = coor[0];

      const lat2Radians = toRadians(lat2);

      const deltaLat = toRadians(lat2 - lat1);
      const deltaLon = toRadians(lng2 - lng1);

      const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1Radians) *
          Math.cos(lat2Radians) *
          Math.sin(deltaLon / 2) *
          Math.sin(deltaLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      let d = R * c;
      if (d < masCerca) {
        masCerca = d;
        masCercaIndex = index;
      }
    });

    return masCercaIndex;
  }

  onStartDrag = evt => {
    evt.preventDefault();
    console.log(evt.lngLat);

    //buscar el punto clickeado en el array
    const masCercaIndex = this.buscarMasCercano(evt);
    console.log(masCercaIndex);

    this.setState({
      movingDot: masCercaIndex,
      dragging: true,
    });
  };

  cambioCalle = e => {
    this.setState({
      calle: e.target.value,
    });
  };
  cambioNumero = e => {
    this.setState({
      numero: e.target.value,
    });
  };

  handleClick = async () => {
    const setPunto = (zona, punto) => {
      this.setState({
        punto,
      });
      console.log('in set punto');
      console.log(punto);
      const atroden = isPip(zona, punto);

      switch (atroden) {
        case -1:
          console.log('adentro');
          alert('En Zona 1');
          break;

        case 0:
          console.log('en el borde');
          alert('En borde de Zona 1');
          break;

        case 1:
          console.log('afuera');
          alert('Fuera de Zona 1');

          break;
        default:
          break;
      }
    };

    const zona = geojson.features[0].geometry.coordinates[0];
    const calle = this.state.calle;
    const numero = this.state.numero;
    const street = `${numero}, ${calle}`;
    const address = `${calle} ${numero}`;
    const city = 'Neuquen';
    const county = 'Municipio de Neuquén';
    const state = 'NQN';
    const state_district = 'Confluencia';
    const postal_code = '8300';
    const country = 'AR';

    const uriNom = encodeURI(
      `https://nominatim.openstreetmap.org/search?format=json&street=${street}&addressdetails=1&city=${city}&country=${country}&county=${county}&state=${state}&state_district=${state_district}`,
    );
    console.log(uriNom);

    const uriGoogle = encodeURI(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${address},${city}&components=locality:${city}&key=AIzaSyB7La5W_I6lHcmai8_8Y15SDyzEBL-CV1c`,
    );
    console.log(uriGoogle);

    async function fetchAsync() {
      const data = await (await fetch(uriGoogle)).json();
      return data;
    }
    async function fetchNomAsync() {
      const data = await (await fetch(uriNom)).json();
      return data;
    }

    fetchAsync().then(res => {
      console.log(res);
      console.log(zona);

      let punto = '';

      // Punto de Google
      if (res.results[0].types[0] === 'street_address') {
        punto = [
          parseFloat(res.results[0].geometry.location.lng),
          parseFloat(res.results[0].geometry.location.lat),
        ];
        setPunto(zona, punto);
      } else {
        fetchNomAsync().then(res => {
          console.log(res);
          if (!res[0]) {
            alert('No se encuentra la dirección');
            return false;
          }
          // Punto de Nominatum
          if (res[0].osm_type === 'way') {
            alert('¡Aproximado!');
          }
          punto = [parseFloat(res[0].lon), parseFloat(res[0].lat)];
          setPunto(zona, punto);
        });
      }
    });
  };

  render() {
    return (
      <div className="App">
        <div>
          <input type="text" value={this.state.calle} onChange={this.cambioCalle} />
          <input type="text" value={this.state.numero} onChange={this.cambioNumero} />

          <button onClick={this.handleClick}>GET</button>
        </div>
        <Map
          center={this.state.punto ? this.state.punto : [-68.0606966, -38.951769]}
          style="mapbox://styles/mapbox/streets-v9"
          zoom={[14]}
          onStyleLoad={this.onStyleLoad}
          onMouseUp={this.onMouseUp}
          onMouseDown={this.onMouseDown}
          onMouseMove={this.onMouseMove}
          containerStyle={{ height: '50vh', width: '100vw' }}
        >
          <GeoJSONLayer
            id="zona-1"
            data={gjLocal}
            fillLayout={{ visibility: 'visible' }}
            fillPaint={{
              'fill-color': { type: 'identity', property: 'fill' },
              'fill-opacity': { type: 'identity', property: 'fill-opacity' },
            }}
            circleLayout={{ visibility: 'visible' }}
            circlePaint={{ 'circle-color': { type: 'identity', property: 'fill' } }}
            // fillOnMouseDown={this.OnMouseDown}
            linelayout={{ visibility: 'visible' }}
            linePaint={{
              'line-color': { type: 'identity', property: 'fill' },
              'line-opacity': 0.8,
              'line-width': 2,
            }}
            circleOnMouseDown={this.onStartDrag}
            symbolPaint={{ 'text-color': 'black' }}
            symbolLayout={{
              'text-field': '{place}',
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-offset': [0, 0.6],
              'text-anchor': 'top',
            }}
          />
          <GeoJSONLayer
            id="zona-2"
            data={zona2Local}
            fillLayout={{ visibility: 'visible' }}
            fillPaint={{
              'fill-color': { type: 'identity', property: 'fill' },
              'fill-opacity': { type: 'identity', property: 'fill-opacity' },
            }}
            circleLayout={{ visibility: 'visible' }}
            circlePaint={{ 'circle-color': { type: 'identity', property: 'fill' } }}
            linelayout={{ visibility: 'visible' }}
            linePaint={{
              'line-color': { type: 'identity', property: 'fill' },
              'line-opacity': 0.8,
              'line-width': 2,
            }}
            circleOnMouseDown={this.onStartDrag}
            circleOnMouseUp={this.onStopDrag}
            symbolPaint={{ 'text-color': 'black' }}
            symbolLayout={{
              'text-field': '{place}',
              'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
              'text-offset': [0, 0.6],
              'text-anchor': 'top',
            }}
          />
          <Layer type="circle" id="marker" paint={{ 'circle-color': '#ff0000' }}>
            <Feature coordinates={this.state.punto ? this.state.punto : this.state.centerMap} />
          </Layer>
        </Map>
        <small> clic izq : agregar punto, ctrl + clic izq : eliminar punto </small>
      </div>
    );
  }
}

export default App;
