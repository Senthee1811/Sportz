import { Router } from 'express'; 
import { matches } from '../db/schema.js'; 
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js';
import { db } from '../db/db.js';
import { getMatchStatus } from '../utils/match-status.js';
import { desc } from 'drizzle-orm';

export const matchRouter = Router(); 
const MAX_LIMIT = 100;

matchRouter.get('/',async(req,res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query); 

    if(!parsed.success){
        return res.status(400).json({
            error: 'Invalid Query Parameters', 
            details: parsed.error.issues
        });
    } 

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT); 

    try {
        const data = await db
        .select()
        .from(matches)
        .orderBy((desc(matches.createdAt)))
        .limit(limit) 

        res.json({ data });
        
    } catch (error) {
        return res.status(500).json({
            error: 'Failed to list the matches', 
            details: error.message
        });
    }
}) 

matchRouter.post('/', async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);

    // ✅ FIX: Check for failure FIRST, then return early.
    if (!parsed.success) {
        return res.status(400).json({ 
            error: 'Invalid Payload', 
            details: parsed.error.issues // Send the object directly, Express handles stringifying
        });
    }

    // Now it is safe to access parsed.data because we know it succeeded
    const { startTime, endTime, homeScore, awayScore, sport, homeTeam, awayTeam } = parsed.data;

    try {
        const [event] = await db.insert(matches).values({
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            sport: sport,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            
            // Optimization: Pass the Date objects we just created to getMatchStatus 
            // to ensure it works with dates, not strings.
            status: getMatchStatus(new Date(startTime), new Date(endTime))
        }).returning(); 
        

        res.status(201).json({ data: event });

    } catch (error) {
        res.status(500).json({ error: 'Failed to Create Match', details: error.message });
    }
});