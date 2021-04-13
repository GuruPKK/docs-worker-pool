/** ******************************************************************
 *                  Github test                       *
 ******************************************************************* */

const GithubService = require('../../services/github').Github
const fs = require('fs');
describe('GitHub Tests', () => {

    let github;

    beforeAll(() => {
        github = new GithubService();
    });

    afterAll(() => { });

    beforeEach(() => { });

    afterEach(() => { });

    it('getBasePath Private repo', async () => {
        output = github.getBasePath('user', 'password', true)
        expect(output).toEqual('https://user:password@github.com');
    });

    it('getBasePath Public repo', () => {
        output = github.getBasePath('user', 'password', false)
        expect(output).toEqual('https://github.com');
    });

    it('downloadfile Works fine', async () => {
        await github.downloadFile('https://github.com/mongodb/docs-worker-pool/blob/master/README.md').then(output => {
            expect(output).toHaveProperty('status');
            expect(output.status).toEqual('success');
        });
    });

    it('downloadfile Works throws error', async () => {
        await github.downloadFile('https://github.com/mongodb/docs-worker-pool/blob/master/README.md').catch(error => {
            expect(error).toBeDefined();
        });
    });

    it('cloneRepo Works empty branch name throws error', async () => {
        await github.cloneRepo(console, 'repos', null, null, null, true).catch(error => {
            expect(error).toBeDefined();
        });
    });

    it('cloneRepo Works public branch name works fine', async () => {
        //  GIVEN
        const directoryName = 'repos';
        if (!fs.existsSync(directoryName)) {
            console.log(directoryName)
            fs.mkdirSync(directoryName);
        }

        // WHEN
        //logger, directoryName, repoOwner, repoName, branchName, privateRepo
        await github.cloneRepo(console, directoryName, 'mongodb', 'docs-worker-pool', 'master', false).then(output => {
            // THEN
            console.log(output)
        });
        //  Cleanup
        fs.rmdirSync(directoryName, { recursive: true });
    });

});
