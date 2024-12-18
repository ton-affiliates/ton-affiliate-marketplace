// Exported function for reuse
export function greet(name: string): string {
    console.log('in Hello got:', name);
    return `Hello, ${name}!`;
}

// If this file is executed directly
if (require.main === module) {
    console.log('require.main === module');
    // Get the command-line arguments (skip the first two default args)
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Please provide a name as an argument.');
        process.exit(1);
    }

    const name = args[0];
    const message = greet(name);
    console.log(message);
}