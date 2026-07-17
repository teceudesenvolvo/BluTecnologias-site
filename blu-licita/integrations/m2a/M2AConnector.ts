import { MockPartnerConnector } from '../mocks/MockPartnerConnector'; import { m2aProvider } from './m2aProvider';
export class M2AConnector extends MockPartnerConnector { constructor() { super(m2aProvider); } }
