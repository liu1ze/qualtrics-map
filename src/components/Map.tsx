import { Grid, makeStyles } from '@mui/material';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Action, GlobalState, useTrackedState, useUpdate } from '../store';
import { Input } from '../types/Input';
import mapboxgl from 'mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import styled from '@emotion/styled';
import { useStandbyIndex } from '../uses/useStandbyIndex';

type Props = {
  accessToken: string;
  // 如果需要外部知道地图什么时候加载完，可以加一个回调
  onMapReady?: (map: mapboxgl.Map) => void;
};

export const Map: React.FC<Props> = (props: Props) => {
  const update = useUpdate();
  const state = useTrackedState();

  const mapContainer = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current || !props.accessToken) return;
    const newMap = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      accessToken: props.accessToken,
    });
// 在地图上监听 'load' 事件，这样可以在地图真的渲染出来后执行逻辑
newMap.on('load', () => {
  console.log('Map fully loaded in <Map> component');

  // 这里可以移除标签层，也可以换样式，或者调用回调
  // 示例：移除几个常见的标签图层
  if (newMap.getLayer('country-label')) {
    newMap.removeLayer('country-label');
  }
  if (newMap.getLayer('settlement-label')) {
    newMap.removeLayer('settlement-label');
  }

  // 如果想要告诉外部“地图已经准备好了”，就调用回调
  if (props.onMapReady) {
    props.onMapReady(newMap);
  }
});
    newMap.on('click', (event: any) => {
      event.target.easeTo({
        center: [event.lngLat.lng, event.lngLat.lat],
        essential: true,
      });
      update({
        type: 'MAP_CLICK',
        location: {
          lat: event.lngLat.lat,
          lng: event.lngLat.lng,
        },
      });
    });

    newMap.on('dragend', (event: any) => {
      update({
        type: 'MAP_MOVE',
        location: {
          lat: event.target.getCenter().lat,
          lng: event.target.getCenter().lng,
        },
      });
    });

    newMap.on('zoomend', (event: any) => {
      update({
        type: 'MAP_ZOOM',
        zoom: event.target.getZoom(),
      });
    });

    update({
      type: 'INITIALIZE_MAP',
      map: newMap,
    });
  }, [mapContainer, props.accessToken,update]);

  useEffect(() => {
    if (state.map && state.view.zoom !== state.map.getZoom()) {
      state.map.setZoom(state.view.zoom);
    }
  }, [state.view.zoom]);

  useEffect(() => {
    if (state.map && state.view.location) {
      state.map.easeTo({
        center: [state.view.location.lng, state.view.location.lat],
        essential: true,
      });
    }
  }, [state.view.location]);

  return <div ref={mapContainer} style={{ height: '60vh', width: '100%' }} />;
};