#!/usr/bin/env node

// import cmdAction from './commands.js'
import chalk from 'chalk';
import fs from 'fs';
import dotenv from 'dotenv'
import { arrayBuffer } from 'stream/consumers';
import prompt from 'prompt'
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { executablePath } from 'puppeteer';
import { createSpinner } from 'nanospinner';
import fetch from 'node-fetch';

dotenv.config();

const [,, ...oneArg] = process.argv;
const inputCmd = process.argv[2];

// console.log('all args: ', oneArg);
// console.log(`input command: ${inputCmd}`);

commandParse(inputCmd);


// handle cli commands and take appropiate actionst
async function commandParse(cliInput) {
    if (oneArg.length === 0) {
        console.log(`
${chalk.yellow('Welcome to starstruck')}


${chalk.yellow('Run ') + chalk.yellow.bold('"starstruck config"') + chalk.yellow(' to get started')}


${chalk.yellow('For additional help and usage, try ') + chalk.yellow.bold('"starstruck help"')}
        `)
        return
    }

    if (oneArg.length > 1) {
        console.log(`${chalk.red.bold('Invalid Syntax')} usage: starstruck <command>`)
        return
    }
    
    
    if (cliInput === 'go') {
        // do something to star all repos in link pool
        console.log(chalk.magentaBright.bold('go command recognized'))

        const user = process.env.GH_USER

        fetch(`http://localhost:3000/reposAPI/${user}`)
        .then((data) => data.json())
        .then((allUserData) => {
          ghLogin(allUserData.repos)
        })
        .then(() => {
          resetUserRepos(user)
        })
        .catch((err) => {
          console.log('major error fetching all user repos', err)
        })

        return
    }
    
    if (cliInput === 'config') {
        // set an env variable to github user/pw to login
        console.log(chalk.blue.bold('config command recognized'))
        let user = '';
        let pw = '';

        const properties = [
            {
              name: 'username',
              warning: 'Username must be only letters, spaces, or dashes'
            },
            {
              name: 'password',
              hidden: true
            }
          ];
          
          prompt.start();
          
          await prompt.get(properties)
          .then(res => {
            user = res.username;
            pw = res.password;
            // console.log(res);
          })
          .catch(err => console.log(err))
        //   console.log(user, pw)

        updateEnv(user, pw)

        return
    }
    
    if (cliInput === 'auto') {
        // set how often this script will run, default will be every X days
        console.log(chalk.green.bold('auto command recognized'))
        return
    }

    if (cliInput === 'delete') {
      console.log(chalk.green.bold('delete command recognized'));

      const user = process.env.GH_USER

      fetch(`http://localhost:3000/reposAPI/deleteuser/${user}`)
        .then((data) => console.log('user deleted'))
        .catch((err) => {
          console.log('major error fetching all user repos', err)
        })

      return
    }

    if (cliInput === 'addrepo') {
        console.log(chalk.white.bgBlue.bold('addrepo command recognized'))
        const properties = [{ name: 'repo_link' }, { name: 'secret' }];
          
          prompt.start();
          
          await prompt.get(properties)
          .then(res => {
            const newRepo = {
                link: res.repo_link,
                secret: res.secret
            }
            fetch('http://localhost:3000/reposAPI', {
              method: 'POST',
              body: JSON.stringify(newRepo),
              headers: { 'Content-Type': 'application/json' }
            })
            .then((res) => {
              if (res.status === 200) {
                console.log(chalk.greenBright.bold(`status ${res.status}: ` ) + 'link added to repo pool!')
              } else {
                console.log(chalk.redBright.bold(`status ${res.status}: `) + 'verify repo link and secret are both valid!')
                console.log('duplicate links are NOT permitted')
              }
            })
            .catch(err => console.log(err)) 
          })
          .catch(err => console.log(err))

        return
    }

    if (cliInput === 'userinfo') {
      const pwArr = process.env.GH_PW.split('');
      console.log(chalk.white.bgMagenta.bold('userinfo command recognized'));
      console.log('GH_USERNAME: ' + chalk.white.bold(`${process.env.GH_USER}`));
      console.log('GH_PASSWORD: ' + chalk.white.bold(`${pwArr[0]}_____${pwArr[pwArr.length - 1]}`));

      return 
    }
    
    if (inputCmd === 'help') {
        console.log(`
    usage: starstruck <command>

    Most common commands
        go:   run starstruck immediately
    config:   update github login credentials (saved to local env var, never stored online)
  userinfo:   see currently saved github username/password info
   addrepo:   add a new github link to the link pool
      auto:   set how often IN SECONDS starstruck checks for new repos to star (default = 7 days)
        `)
        return
    }
    
    console.log(chalk.red.bold('ERR: ') + ('command not recognized, try "starstruck help"'))
    return 
}

function updateEnv(user, pw) {
    // get an array of all key value pairs in one single string
    const varArr = [`GH_USER=${user}`, `GH_PW=${pw}`]

    // erase old key value pairs
    fs.writeFileSync('.env', '');

    // set new key value pairs in .env to keep them "hiddenish" lol
    for (let i = 0; i < varArr.length; i++) {
        fs.appendFileSync('.env', varArr[i] + '\n');
    }

    return;
}

// deprecated for unimportant reasons
// function getConfig() {
//     const properties = [
//         {
//           name: 'username',
//           warning: 'Username must be only letters, spaces, or dashes'
//         },
//         {
//           name: 'password',
//           hidden: true
//         }
//       ];
      
//       prompt.start();
      
//       prompt.get(properties)
//       .then(res => {
//         return [res.username, res.password]
//       })
//       .catch(err => console.log(err))
// }

async function ghLogin(repoArray) {
  // loading icon
  // const spinner = createSpinner('Dishing out stars...').start();

  // additional stuff we might want
  const usersUpdated = [];
  let totalStarred = 0;

  // getting stealthy bruh
  puppeteer.use(StealthPlugin());

    // open new browser
    const browser = await puppeteer.launch({
      executablePath: executablePath(),
      headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

    // open new page, similar to opening a new tab
    let page = await browser.newPage();
    await page.setDefaultTimeout(10000)
    await page.setViewport({
      width: 625,
      height: 600
    })
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'
    });

    // navigate to gh login page on "new tab"
    // await Promise.all([
    //   page.goto('https://github.com/'),
    //   page.waitForNavigation({waitUntil: 'networkidle2'})
    // ])
    await page.goto('https://github.com/')

    // wait for load and click sign in button on github
    // let loginSelect = 'body > div.logged-out.env-production.page-responsive.header-overlay.home-campaign > div.position-relative.js-header-wrapper > header > div > div.HeaderMenu--logged-out.p-responsive.height-fit.position-lg-relative.d-lg-flex.flex-column.flex-auto.pt-7.pb-4.top-0 > div > div > div.position-relative.mr-lg-3.d-lg-inline-block > a'
    let threeLine = '.js-details-target.Button--link.Button--medium.Button';
    let newSignButton = '.HeaderMenu-link.HeaderMenu-link--sign-in';
    await page.waitForSelector(threeLine);
    await page.click(threeLine);
    await page.waitForSelector(newSignButton);
    await page.click(newSignButton);

    // enter username and password and click sign in form submission button, get from env variables
    await page.waitForSelector('#login_field');
    await page.focus('#login_field')
    await page.keyboard.type(process.env.GH_USER);

    await page.focus('#password');
    await page.keyboard.type(process.env.GH_PW);

    await page.click('#login > div.auth-form-body.mt-3 > form > div > input.btn.btn-primary.btn-block.js-sign-in-button')

    // now logged in, so navigate to next unstarred repo
    // need to verify it isnt already clicked, dont want to unstar a repo we already starred 
    // (hint for myself for later, check span id and aria-label of star span element)
    let starButton = '#responsive-meta-container > div > div.d-flex > div.flex-1.mr-2 > div > div.unstarred.BtnGroup.flex-1 > form > button';

    for (let i = 0; i < repoArray.length; i++) {
      // info should hold github handle and repo that starred
      const info = [];
      const currRepo = repoArray[i];
      const splitLink = currRepo.link.split('/');
      await Promise.all([
        page.goto(currRepo.link),
        page.waitForNavigation({waitUntil: 'networkidle2'}),
      ])

      // new strat for later, rather than waiting for selector, check what selector
      // evaluates to and if it evaluates to null move on otherwise do everything
      await page.waitForSelector(starButton)
      await page.click(starButton);
      totalStarred++;
      info.push(splitLink[3], splitLink[4]);
      usersUpdated.push(info);
      // these are all operations we want to perform if the starbutton
      // is unclicked, otherwise move on to the next repo
      // note for later error with eval, cannot read properties .toString

      // if (await page.$eval(starButton) !== null) {
      //   await page.waitForSelector(starButton)
      //   await page.click(starButton);
      //   totalStarred++;
      //   info.push(splitLink[3], splitLink[4]);
      //   usersUpdated.push(info);
      // }

    }

    // always close browser after done, dont hang
    await browser.close();

    console.log( `
    ${chalk.blue.bold.underline('Total Repos Starred:')} ${totalStarred}
    `);

    usersUpdated.forEach((el) => {
      console.log(`${chalk.white.bold('user: ')} ${chalk.yellowBright.bold(`${el[0]}`)}     ${chalk.white.bold('repo: ')} ${chalk.magentaBright.bold(`${el[1]}`)}`)
    })

    // spinner.stop().clear();
    return;
}

function resetUserRepos(inputUser) {
  // see if user already exists, server will create new account for them if they dont
  fetch(`http://localhost:3000/reposAPI/update/${inputUser}`)
  .then(() => {
    // console.log(`${user} updated in db`);
  })
  .catch((err) => console.log(err));

  return
}