package mohammad.development.praxis.modules.patient;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class SymptomDetail {
    private String key;
    private String label;
    private String option;
    private Integer severity;
    private String onset;
    private String notes;
}
