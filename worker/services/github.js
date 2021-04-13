const simpleGit = require('simple-git/promise');
const got = require('got');


class GithubService {
    // pass in a job payload to setup class
    constructor() {
    }

    // get base path for public/private repos
    getBasePath(userName, password, privateRepo = false) {
        return (privateRepo) ? `https://${userName}:${password}@github.com` : "https://github.com";
    }

    // Download specified file
    async downloadFile(filePath) {
        const returnObject = {};
        try {
            let resp = await got(filePath);
            returnObject['status'] = 'success';
            returnObject['content'] = resp.body;
        } catch (error) {
            returnObject['status'] = 'failure';
            returnObject['content'] = response;
        }
        return returnObject
    }

    async cloneRepo(logger, directoryName, repoOwner, repoName, branchName, privateRepo) {
        logger.log(`${'(GIT)'.padEnd(15)}Cloning repository`);
        logger.log(`${'(GIT)'.padEnd(15)}running fetch`);

        if (!branchName) {
            logger.log(
                `${'(CLONE)'.padEnd(15)}failed due to insufficient definition`
            );
            throw new Error('branch name not indicated');
        }
        try {
            const basePath = this.getBasePath(privateRepo);
            const repoPath = basePath + '/' + repoOwner + '/' + repoName;
            return await simpleGit(directoryName)
                .silent(false)
                .clone(repoPath, `${repoName}`)
                .catch(err => {
                    logger.error('failed: ', err);
                    throw err;
                });
        } catch (errResult) {
            logger.error(`${'(GIT)'.padEnd(15)}stdErr: ${errResult.stderr}`);
            throw errResult;
        }
    }
}

module.exports = {
    Github: GithubService
};
