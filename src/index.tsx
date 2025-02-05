import React from 'react';
import { render } from 'react-dom';
import { Container } from './components';
import { Provider } from './store';

// 先定义一下类型，包含新的 onMapReady 回调
interface MapRenderOptions {
  formLocation?: 'top' | 'bottom';
  defaultPins?: [
    {
      location: { lat: number; lng: number };
      editable: boolean;
    },
  ];
  defaultView?: {
    location: { lat: number; lng: number };
    zoom: number;
  };
  // 新增的回调：地图创建完后会把 map 实例传回来
  onMapReady?: (map: mapboxgl.Map) => void;
}

export function mapRender(
  accessToken: string,
  target: HTMLElement,
  options?: MapRenderOptions
) {
  const container = document.createElement('div');
  container.setAttribute('id', `MapContainer${target.id}`);

  target.getElementsByClassName('ChoiceStructure')[0].appendChild(container);

  const directionContainer = target.querySelectorAll('[role*=presentation]')[0] as HTMLElement;

  // 把新的 options 透传给子组件
  render(
    <Provider>
      <Container
        accessToken={accessToken}
        directionContainer={directionContainer}
        options={options}
      />
    </Provider>,
    container
  );

  directionContainer.style.display = 'none';
}


(window as any).mapRender = mapRender;
