import User from "../../models/User.js";

export const migrateLegacyIdentityToUsername = async () => {
  const usersCollection = User.collection;
  const existingUser = await usersCollection.findOne({});

  if (!existingUser) {
    return;
  }

  const hasUsername = typeof existingUser.username === "string" && existingUser.username.trim().length > 0;
  const legacyIdentity = typeof existingUser.email === "string" ? existingUser.email.trim() : "";

  if (hasUsername) {
    if (legacyIdentity) {
      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $unset: {
            email: ""
          },
          $set: {
            updatedAt: new Date()
          }
        }
      );
    }
    return;
  }

  if (!legacyIdentity) {
    throw new Error("User migration failed: missing both username and legacy identity");
  }

  await usersCollection.updateOne(
    { _id: existingUser._id },
    {
      $set: {
        username: legacyIdentity,
        updatedAt: new Date()
      },
      $unset: {
        email: ""
      }
    }
  );
};
