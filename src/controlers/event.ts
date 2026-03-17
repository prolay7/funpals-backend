import { Request, Response } from "express";
import { db } from "../lib/db";
import { eventRsvpsTable, eventsTable, usersTable } from "../schema";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";

export const listEvents: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;

        const events = await db
            .select({
                id: eventsTable.id,
                title: eventsTable.title,
                description: eventsTable.description,
                location: eventsTable.location,
                startsAt: eventsTable.startsAt,
                endsAt: eventsTable.endsAt,
                isGroup: eventsTable.isGroup,
                groupId: eventsTable.groupId,
                createdBy: eventsTable.createdBy,
                createdAt: eventsTable.createdAt,
                myRsvp: sql<string>`(
                    SELECT status FROM event_rsvps
                    WHERE event_id = ${eventsTable.id} AND user_id = ${id}
                    LIMIT 1
                )`,
            })
            .from(eventsTable)
            .where(
                and(
                    isNull(eventsTable.deletedAt),
                    or(
                        eq(eventsTable.createdBy, id),
                        eq(eventsTable.isGroup, true),
                        sql`EXISTS (
                            SELECT 1 FROM event_rsvps
                            WHERE event_id = ${eventsTable.id} AND user_id = ${id}
                        )`
                    )
                )
            )
            .orderBy(asc(eventsTable.startsAt));

        return res.status(200).json({ success: true, message: 'Events fetched', events });
    } catch (error) {
        console.log('Error fetching events:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createEvent: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        const { title, description, location, startsAt, endsAt, groupId, isGroup } = req.body;

        if (!title || !startsAt || !endsAt) {
            return res.status(400).json({ success: false, message: 'Title, startsAt and endsAt are required' });
        }
        if (title.length > 120) return res.status(400).json({ success: false, message: 'Title must be 120 characters or less' });

        const [event] = await db
            .insert(eventsTable)
            .values({
                title,
                description: description ?? null,
                location: location ?? null,
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
                createdBy: id,
                groupId: groupId ?? null,
                isGroup: !!isGroup,
            })
            .returning();

        return res.status(201).json({ success: true, message: 'Event created', event });
    } catch (error) {
        console.log('Error creating event:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getEvent: any = async (req: Request, res: Response) => {
    try {
        const eventId = Number(req.params.id);
        if (!eventId) return res.status(400).json({ success: false, message: 'Invalid event id' });

        const [event] = await db
            .select()
            .from(eventsTable)
            .where(and(eq(eventsTable.id, eventId), isNull(eventsTable.deletedAt)))
            .limit(1);

        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const rsvps = await db
            .select({
                userId: eventRsvpsTable.userId,
                status: eventRsvpsTable.status,
                userName: usersTable.name,
                userPhoto: usersTable.profilephoto,
            })
            .from(eventRsvpsTable)
            .leftJoin(usersTable, eq(eventRsvpsTable.userId, usersTable.id))
            .where(eq(eventRsvpsTable.eventId, eventId));

        return res.status(200).json({ success: true, message: 'Event fetched', event, rsvps });
    } catch (error) {
        console.log('Error fetching event:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const setRsvp: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        const eventId = Number(req.params.id);
        const { status } = req.body;

        if (!eventId) return res.status(400).json({ success: false, message: 'Invalid event id' });
        if (!['going', 'maybe', 'declined'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Status must be going, maybe, or declined' });
        }

        await db
            .insert(eventRsvpsTable)
            .values({ eventId, userId: id, status })
            .onConflictDoUpdate({
                target: [eventRsvpsTable.eventId, eventRsvpsTable.userId],
                set: { status },
            });

        return res.status(200).json({ success: true, message: 'RSVP updated' });
    } catch (error) {
        console.log('Error setting RSVP:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
