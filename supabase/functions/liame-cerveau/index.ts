Deno.serve(() => {
  return new Response(
    JSON.stringify({
      message: "Bonjour, je suis LIAME !",
      statut: "cerveau en préparation"
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
});
