import { supabase } from './auth'
import { parseBackup } from './library'

const TABLE = 'bookshelves'

export function createAccountStorage(userId) {
  let revision = null
  let pending = Promise.resolve()

  return {
    async load() {
      const { data, error } = await supabase.from(TABLE).select('library, revision')
        .eq('user_id', userId).maybeSingle()
      if (error) throw error
      if (!data) {
        revision = null
        return null
      }
      const library = parseBackup(JSON.stringify({ ...data.library, format: 'my-bookshelf', version: 1 }))
      revision = data.revision
      return library
    },
    save(library) {
      const write = pending.catch(() => {}).then(async () => {
        const nextRevision = (revision ?? 0) + 1
        const response = revision === null
          ? await supabase.from(TABLE).insert({ user_id: userId, library, revision: nextRevision })
            .select('revision').single()
          : await supabase.from(TABLE).update({ library, revision: nextRevision })
            .eq('user_id', userId).eq('revision', revision).select('revision').maybeSingle()

        if (response.error && response.error.code !== '23505') throw response.error
        if (!response.data) {
          const conflict = new Error('This shelf changed in another tab or device. Download a backup of your changes before reloading.')
          conflict.name = 'ShelfConflictError'
          throw conflict
        }
        revision = response.data.revision
      })
      pending = write
      return write
    },
    waitForSave() {
      return pending
    },
  }
}
