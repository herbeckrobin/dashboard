import { requireAuth } from '../../../lib/auth'
import { getConfig, saveConfig } from '../../../lib/config'
import { AI_MODELS } from '../../../lib/ai-generate'

export default async function handler(req, res) {
  if (!await requireAuth(req, res)) return
  if (req.method === 'GET') {
    const config = getConfig()
    return res.json({ giteaToken: config.giteaToken || '', pageSpeedApiKey: config.pageSpeedApiKey || '', aiProvider: config.aiProvider || 'anthropic', aiApiKey: config.aiApiKey || '', aiModel: config.aiModel || '', aiAgentMode: config.aiAgentMode || false, aiModels: AI_MODELS })
  }

  if (req.method === 'POST') {
    const { giteaToken, pageSpeedApiKey, aiProvider, aiApiKey, aiModel, aiAgentMode } = req.body
    const updates = {}
    if (giteaToken !== undefined) updates.giteaToken = giteaToken || ''
    if (pageSpeedApiKey !== undefined) updates.pageSpeedApiKey = pageSpeedApiKey || ''
    if (aiProvider !== undefined) updates.aiProvider = aiProvider || 'anthropic'
    if (aiApiKey !== undefined) updates.aiApiKey = aiApiKey || ''
    if (aiModel !== undefined) updates.aiModel = aiModel || ''
    if (aiAgentMode !== undefined) updates.aiAgentMode = !!aiAgentMode
    saveConfig(updates)
    return res.json({ success: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
