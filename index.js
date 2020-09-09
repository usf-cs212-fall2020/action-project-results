const core = require('@actions/core');
const github = require('@actions/github');
const context = github.context;

async function run() {
  try {
    const info = JSON.parse(core.getInput('info'));
    const octokit = github.getOctokit(core.getInput('token'));

    let title = `🛑 Project ${info.project_number} Verification Failed`
    let message = `One or more tests in ${info.project_tester} for release ${info.release_number} failed.`
    let level = 'failure'
    let conclusion = 'failure'

    if (core.getInput('outcome') == 'success') {
      title = `🎉 Project ${info.project_number} Verification Passed!`
      message = `Congratulations ${context.actor}! All tests in ${info.project_tester} for release ${info.release_number} passed!`
      level = 'notice'
      conclusion = 'success'
    }

    core.info('Updating annotations...')
    const annotation = await octokit.checks.create({
      owner: context.payload.organization.login,
      repo: context.payload.repository.name,
      name: `Verify: ${info.release_number}`,
      head_sha: context.sha,
      conclusion: conclusion,
      output: {
        title: title,
        summary: message,
        annotations: [
          {
             path: `.github`,
             start_line: 1,
             end_line: 1,
             annotation_level: level,
             message: message,
             title: title
          }
        ]
      }
    });

    core.info(`Annotation at: ${annotation.data.html_url}`);

    core.info('Updating release...')
    const release = await octokit.repos.getReleaseByTag({
      owner: context.payload.organization.login,
      repo: context.payload.repository.name,
      tag: info.release_number
    });

    await octokit.repos.updateRelease({
      owner: context.payload.organization.login,
      repo: context.payload.repository.name,
      release_id: release.data.id,
      body: message
    });

    if (conclusion == 'success') {
      core.info(title);
      core.info(message);
    }
    else {
      core.error(title);
      core.setFailed(message);
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run();
