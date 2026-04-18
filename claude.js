export const claudeService = {
  ask: async (messages, model = 'claude-sonnet-4-20250514', maxTokens = 4000) => {
    try {
      // La URL ahora es relativa al dominio de Vercel
      const response = await fetch(`/api/claude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Claude API request failed');
      }

      const data = await response.json();
      return data.content[0]?.text || '';
    } catch (error) {
      console.error('Claude Service Error:', error);
      throw error;
    }
  },

  chat: async (userMessage, systemPrompt = '') => {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'user',
        content: `${systemPrompt}\n\nUser: ${userMessage}`
      });
    } else {
      messages.push({
        role: 'user',
        content: userMessage
      });
    }

    return await claudeService.ask(messages);
  }
};

export default claudeService;