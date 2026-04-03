import { expect } from 'chai';
import * as lib from '../../lib';

describe('lib barrel (index)', () => {
  it('re-exports template-loader and schema-cache', () => {
    expect(lib.loadTemplate).to.be.a('function');
    expect(lib.loadCompleteTemplate).to.be.a('function');
    expect(lib.getNonce).to.be.a('function');
    expect(lib.getWebviewUri).to.be.a('function');
    expect(lib.getWebviewOptions).to.be.a('function');
    expect(lib.buildCsp).to.be.a('function');
    expect(lib.SchemaCache).to.be.a('function');
    expect(lib.getSchemaCache).to.be.a('function');
  });
});
