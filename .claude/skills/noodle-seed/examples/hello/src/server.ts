import { annotations, server, tool, z } from '@noodleseed/one';

export default server(
  'hello',
  {
    title: 'Hello',
    version: '1.0.0',
    branding: {
      name: 'Hello',
      accent: '#1D9E75',
      radius: 'md',
      density: 'comfortable',
    },
  },
  [
    tool('greet', {
      // Every model-visible tool declares a title: hosts show it in tool pickers and confirmation
      // prompts, and both consumer directories reject tools without one.
      title: 'Greet someone',
      description: 'Greet someone by name.',
      input: z.object({
        // Defaults are advertised to the model and applied at runtime when the argument is omitted.
        name: z.string().default('world'),
      }),
      output: z.object({
        message: z.string(),
      }),
      // Read-only, closed-world: assistant surfaces run this without a consent prompt.
      annotations: annotations.readOnly(),
      fulfil: ({ input }) => {
        return { message: `Hello, ${input.name}!` };
      },
    }),
  ],
);
