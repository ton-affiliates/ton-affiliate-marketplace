import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/affiliate_marketplace.tact',
    options: {
        debug: true,
    },
};
