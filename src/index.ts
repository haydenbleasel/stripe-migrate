import { program } from 'commander';
import chalk from 'chalk';
import pkg from '../package.json';

const { log } = console;

program
  .name('stripe-migrate')
  .description(pkg.description)
  .version(pkg.version);

program
  .command('x')
  .description('y')
  .argument('<command>', 'command to generate')
  .option('--z <z>', 'z desc', 'default')
  .action(async (code: string, options: { language: string }) => {
    log(chalk.red('test'));
  });

program.parse();
