import React, { useState, useEffect, useReducer } from 'react';
import { Grid } from '@mui/material';
import { ClearButton } from './ClearButton';
import { Map } from './Map';
import { View } from '../types/View';
import { useTrackedState, useUpdate } from '../store';
import { InputForm } from './InputForm';
import mbxGeocoder from '@mapbox/mapbox-sdk/services/geocoding';
import { stat } from 'fs';
import mapboxgl from 'mapbox-gl';
import { createLabelHtml } from '../utils/createLabelHtml';

type Props = {
  accessToken: string;
  directionContainer: HTMLElement;
  options?: {
    formLocation?: 'top' | 'bottom';
    defaultPins?: [
      {
        location: { lat: number; lng: number };
        editable: boolean;
      },
    ];
    defaultView?: View;
  
    // 新增回调: 地图加载完成后把 Map 实例传出去
    onMapReady?: (map: mapboxgl.Map) => void
  };
};

export const Container: React.FC<Props> = (props) => {
  const state = useTrackedState();
  const update = useUpdate();

  const getInitialLocation = () => {
    const region = (window as any).countryCode || 'US';
    const address = (window as any).postalCode
      ? `${region} ${(window as any).postalCode}`
      : region;
    return address;
  };

  const isEditableAt = (index: number) => {
    if (props.options?.defaultPins) {
      return props.options.defaultPins[index] !== undefined
        ? props.options.defaultPins[index].editable
        : true;
    }
    return true;
  };
  useEffect(() => {
    if (!state.map) {
      console.log('Container sees no map yet, skip attaching load event');
      return; // 如果还没拿到地图对象，就直接返回
    }
    console.log('Container sees a valid map, attach load event');
    // 只需要注册一次 'load'，避免重复
    const handleLoad = () => {
      console.log('Container detect map load event...');
      // 地图加载完成后，如果外部提供了 onMapReady 回调，就调用
      if (props.options?.onMapReady) {
        props.options.onMapReady(state.map!);
      }
    };

    // 如果地图还没触发过 'load'，就监听一下
    state.map.on('load', handleLoad);

    // 清理函数，组件卸载或 map 对象变动时，移除监听
    return () => {
      state.map?.off('load', handleLoad);
    };
  }, [state.map]);

  useEffect(() => {
    const geocoderService = mbxGeocoder({
      accessToken: props.accessToken,
    });

    if (props.options?.defaultView?.location) {
      update({
        type: 'MAP_MOVE',
        location: props.options.defaultView.location,
      });
    } else {
      geocoderService
        .forwardGeocode({
          query: getInitialLocation(),
        })
        .send()
        .then((response) => {
          if (response.body.features[0]) {
            update({
              type: 'MAP_MOVE',
              location: {
                lat: response.body.features[0].center[1],
                lng: response.body.features[0].center[0],
              },
            });
          }
        });
    }

    update({
      type: 'INITIALIZE_GEOCODER',
      geocoder: geocoderService,
    });

    if ([...labelHTMLElements].length > 0) {
      update({
        type: 'ADD_INPUTS',
        inputs: [...labelHTMLElements].map((item, index) => ({
          label: item.children[0].textContent
            ? item.children[0].textContent
            : '',
          htmlElement: inputHTMLElements[index],
          editable: isEditableAt(index),
        })),
      });
    }
    if (props.options?.defaultView?.zoom) {
      update({
        type: 'MAP_ZOOM',
        zoom: props.options.defaultView.zoom,
      });
    }
  }, []);

  useEffect(() => {
    if (state.symbols.length === 0 && state.inputs.length > 0 && state.map) {
      update({
        type: 'ADD_MARKERS',
        symbols: state.inputs.map((_item, index) => ({
          marker: new mapboxgl.Marker({
            draggable: isEditableAt(index),
            color: isEditableAt(index) ? '#3FB1CE' : '#CCCCCC',
          })
            .on('dragstart', (event: any) => {
              update({
                type: 'RESET_CLICKED_INDEX',
              });
            })
            .on('dragend', (event: any) => {
              update({
                type: 'MOVE_MARKER_BY_DRAGGING',
                location: {
                  lat: event.target.getLngLat().lat,
                  lng: event.target.getLngLat().lng,
                },
                index: index,
              });
            })
            .setLngLat([0, 90])
            .addTo(state.map!),
          label: new mapboxgl.Marker({
            element: createLabelHtml(state.inputs[index].label),
            draggable: false,
            offset: [0, -48],
          })
            .setLngLat([0, 90])
            .addTo(state.map!),
        })),
      });
    }
  }, [state.symbols, state.inputs, state.map]);

  useEffect(() => {
    if (state.symbols.length > 0 && props.options?.defaultPins) {
      props.options.defaultPins.forEach((pin) => {
        update({
          type: 'MAP_CLICK',
          location: pin.location,
        });
      });
    }
  }, [state.symbols]);

  const inputHTMLElements =
    props.directionContainer.getElementsByTagName('input');
  const labelHTMLElements =
    props.directionContainer.getElementsByTagName('label');

  return (
    <Grid container>
      <Grid
        item
        container
        xl={12}
        lg={12}
        md={12}
        sm={12}
        xs={12}
        style={{
          padding: '0 0 1rem 0',
        }}
        order={props.options?.formLocation === 'bottom' ? 2 : 0}
      >
        <InputForm />
      </Grid>
      <Grid
        item
        container
        xl={12}
        lg={12}
        md={12}
        sm={12}
        xs={12}
        order={props.options?.formLocation === 'bottom' ? 0 : 1}
      >
        <Map accessToken={props.accessToken} />
      </Grid>
      <Grid
        container
        justifyContent={'center'}
        order={props.options?.formLocation === 'bottom' ? 1 : 2}
      >
        <ClearButton />
      </Grid>
    </Grid>
  );
};
