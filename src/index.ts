import { program } from 'commander';
import pkg from '../package.json';
import { migrate } from './lib/migrate';

program
  .name('stripe-migrate')
  .description(pkg.description)
  .version(pkg.version);

program
  .command('x')
  .description('y')
  .argument('<command>', 'command to generate')
  .option('--z <z>', 'z desc', 'default')
  .action(migrate);

program.parse();
