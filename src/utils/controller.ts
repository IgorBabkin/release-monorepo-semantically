import {setClassMetadata, setMethodMetadata} from 'ts-ioc-container';

export const action = (props: { default?: boolean } = {}) => setMethodMetadata('action', () => props);
export const controller = (props: { alias: string }) => setClassMetadata('controller', () => props);
