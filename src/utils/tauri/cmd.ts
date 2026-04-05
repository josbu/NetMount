import { Command } from '@tauri-apps/plugin-shell'

async function runCmd(cmd: string, args: string[]): Promise<string> {
  const commandInstance = Command.create(cmd, args)

  try {
    const result = await commandInstance.execute()

    if (result.code === 0) {
      return result.stdout
    } else {
      throw new Error(`Command failed with exit code ${result.code}: ${cmd} ${args.join(' ')}\nError: ${result.stderr}`)
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to execute command: ${cmd} ${args.join(' ')}\n${error.message}`)
    } else {
      throw new Error(`Unknown error occurred while executing command: ${cmd} ${args.join(' ')}`)
    }
  }
}

export { runCmd }
