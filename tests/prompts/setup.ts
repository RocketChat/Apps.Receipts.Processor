import nock from 'nock';
import path from 'path';
import fs from 'fs';

beforeAll(() => {
    const nockFixturesPath = path.join(__dirname, '..', 'cassettes');

    if (!fs.existsSync(nockFixturesPath)) {
        fs.mkdirSync(nockFixturesPath);
    }

    nock.back.fixtures = nockFixturesPath;
    nock.back.setMode('record');
});

afterEach(() => {
    nock.cleanAll();
});