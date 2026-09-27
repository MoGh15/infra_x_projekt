package mohammad.development.praxis.modules.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Set;

@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
@Document(collection = "admins")
public class Admin {

    @Id
    private String id;

    @Indexed(name = "username_unique", unique = true)
    private String username;

    /** bcrypt hash */
    private String passwordHash;

    private Set<String> roles; // z.B. ["ADMIN"]

    private boolean enabled = true;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
