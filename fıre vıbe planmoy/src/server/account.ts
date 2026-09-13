import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db'
import { requireSession } from './session'
import { appointments, availability, businesses, customers, professionals, services, user } from './schema'

/** Permanently removes the signed-in user's workspace and account. */
const deleteConfirmations = ['SİL', 'DELETE', 'LÖSCHEN', 'SUPPRIMER', 'ELIMINAR', 'حذف', 'УДАЛИТЬ', '删除'] as const

export const deleteAccount = createServerFn({ method: 'POST' }).middleware([requireSession]).validator(z.object({ confirmation: z.enum(deleteConfirmations) })).handler(async ({ data, context }) => {
  const userId = context.session.user.id
  if (!deleteConfirmations.includes(data.confirmation)) throw new Error('Hesap silme onayı geçersiz.')
  await db.transaction(async tx => {
    const ownedBusinesses = await tx.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerId, userId))
    const businessIds = ownedBusinesses.map(row => row.id)
    if (businessIds.length) {
      const ownedProfessionals = await tx.select({ id: professionals.id }).from(professionals).where(inArray(professionals.businessId, businessIds))
      const professionalIds = ownedProfessionals.map(row => row.id)
      await tx.delete(appointments).where(and(eq(appointments.ownerId, userId)))
      await tx.delete(appointments).where(inArray(appointments.businessId, businessIds))
      if (professionalIds.length) await tx.delete(availability).where(inArray(availability.professionalId, professionalIds))
      await tx.delete(customers).where(inArray(customers.businessId, businessIds))
      await tx.delete(services).where(inArray(services.businessId, businessIds))
      await tx.delete(professionals).where(inArray(professionals.businessId, businessIds))
      await tx.delete(businesses).where(inArray(businesses.id, businessIds))
    }
    await tx.delete(user).where(eq(user.id, userId))
  })
  return { ok: true as const }
})
