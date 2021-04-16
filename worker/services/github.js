const simpleGit = require('simple-git/promise');
const got = require('got');
var fs = require('fs');

class GithubService {
    // pass in a job payload to setup class
    constructor(userName, password) {
        this.userName = userName;
        this.password = password;
    }

    // get base path for public/private repos
    getBasePath(privateRepo = false) {
        return (privateRepo) ? `https://${this.userName}:${this.password}@github.com` : "https://github.com";
    }

    // Download specified file
    async downloadFile(filePath, parser=null) {
        const returnObject = {};
        try {
            let resp = await got(filePath);
            returnObject['status'] = 'success';
            returnObject['content'] = parser? parser(resp.body) : resp.body;
        } catch (error) {
            returnObject['status'] = 'failure';
            returnObject['content'] = response;
        }
        return returnObject
    }

    async cloneRepo(directoryName, repoOwner, repoName, branchName, privateRepo) {
        if (!branchName) {
            throw new Error('branch name not indicated');
        }
        console.log(directoryName);
        if (!fs.existsSync(directoryName)){
            fs.mkdirSync(directoryName);
        }
        try {
            const basePath = this.getBasePath(privateRepo);
            const repoPath = basePath + '/' + repoOwner + '/' + repoName;
            return await simpleGit(directoryName)
                .silent(false)
                .clone(repoPath, `${repoName}`)
                .catch(err => {
                    throw err;
                });
        } catch (errResult) {
            throw errResult;
        }
    }
}
module.exports = {
    GithubService
  }